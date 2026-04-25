import type {Express, Request, Response} from "express";
import {type Pool} from "pg";
import argon2 from "argon2";
import {SignupSchema, usernameSchema, emailSchema, passwordSchema} from "#/src/validation/schemas.js";
import {z} from "zod";
import {isDbError, isUniqueViolation} from "#/src/utils.js";
import type {ApiResponse, User} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";
import {requireAuth} from "#/src/middleware.js";
import {getUserById, getUserByUsername, getUserByEmail, createUser, deleteUserById} from "#/src/queries/users.js";

function signupUser(app: Express) {
	app.post("/api/user", async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		const {username, email, password} = req.body;

		try {
			SignupSchema.parse({username, email, password});
			const hash = await argon2.hash(password, {
				type: argon2.argon2id,
			});

			//const id = await createUser({username, email} as User, hash);
			await createUser({username, email} as User, hash);
			res.status(201).json({ok: true, data: null});
		} catch (error: unknown) {
			if (isDbError(error) && isUniqueViolation(error)) {
				res.status(409).json({ok: false, error: "Username or email already in use"});
			} else if (error instanceof z.ZodError) {
				const msg = error.issues[0].message;
				res.status(400).json({ok: false, error: msg});
			}
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function modifyUser(app: Express, db: Pool) {
	app.patch("/api/user", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		const {username, email, oldPassword, newPassword} = req.body;
		const id = req.session.userId as number;

		if (!username && !email && !newPassword) {
			return res.status(400).json({ok: false, error: "Nothing to update"});
		}

		try {
			const user = await getUserById(id);
			// this should never be true, but added because of Typescript
			if (!user) {
				throw new Error("Not a valid user");
			}

			if (username) {
				usernameSchema.parse(username);

				if (user.username === username) {
					return res
						.status(400)
						.json({ok: false, error: "No change made: New username can not be the same as old username"});
				}

				const usernameExists = await getUserByUsername(username);
				if (usernameExists) {
					return res.status(409).json({ok: false, error: "Username already taken"});
				}

				const query = "UPDATE users SET username = $1 WHERE id = $2";
				const values = [username, id];
				timestampedLog(`DB QUERY >>> ${query}`);
				timestampedLog(`DB VALUES >>> ${values}`);
				await db.query(query, values);
			}

			if (email) {
				emailSchema.parse(email);

				if (user.email === email) {
					return res.status(400).json({ok: false, error: "No change made: New email can not be the same as old email"});
				}
				const emailExists = await getUserByEmail(email);
				if (emailExists) {
					return res.status(409).json({ok: false, error: "Email already taken"});
				}

				const values = [email, id];
				const query = "UPDATE users SET email = $1 WHERE id = $2";
				timestampedLog(`DB QUERY >>> ${query}`);
				timestampedLog(`DB VALUES >>> ${values}`);
				await db.query(query, values);
			}

			if (newPassword) {
				passwordSchema.parse(newPassword);

				let query = "SELECT hashed_password FROM users WHERE id = $1";
				timestampedLog(`DB QUERY >>> ${query}`);
				timestampedLog(`DB VALUES >>> ${[id]}`);
				const result = await db.query(query, [id]);
				if (result.rows.length === 0) {
					return res.status(500).json({ok: false, error: "database error"});
				}

				const match = await argon2.verify(result.rows[0].hashed_password, oldPassword);
				if (!match) {
					return res.status(401).json({ok: false, error: "Incorrect password"});
				}

				const hash = await argon2.hash(newPassword, {
					type: argon2.argon2id,
				});

				if (await argon2.verify(result.rows[0].hashed_password, newPassword)) {
					return res.status(400).json({ok: false, error: "New Password can not be the same as old password!"});
				}

				const values = [hash, id];
				query = "UPDATE users SET hashed_password = $1 WHERE id = $2";
				timestampedLog(`DB QUERY >>> ${query}`);
				timestampedLog(`DB VALUES >>> ${values}`);
				await db.query(query, values);
			}

			res.status(200).json({ok: true, data: null});
		} catch (error: unknown) {
			if (error instanceof z.ZodError) {
				const msg = error.issues[0].message;
				res.status(400).json({ok: false, error: `${msg}`});
			}
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function deleteUser(app: Express) {
	app.delete("/api/user", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const id = req.session.userId as number;
		try {
			if ((await deleteUserById(id)) === false) {
				throw new Error("Deletion failure");
			}
			res.clearCookie("connect.sid");
			res.status(200).json({ok: true, data: null});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function getUser(app: Express) {
	app.get("/api/user", requireAuth, async (req: Request, res: Response<ApiResponse<User>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const id = req.session.userId as number;
		try {
			const user = await getUserById(id);
			if (!user) {
				throw new Error("No query result");
			}

			res.status(200).json({ok: true, data: user});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

export default {signupUser, deleteUser, getUser, modifyUser};

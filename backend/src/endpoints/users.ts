import type {Express, Request, Response} from "express";
import argon2 from "argon2";
import {SignupSchema, usernameSchema, emailSchema, passwordSchema} from "#/src/validation/schemas.js";
import {isDbError, isUniqueViolation} from "#/src/utils.js";
import type {ApiResponse, User} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";
import {requireAuth} from "#/src/middleware.js";
import {
	getUserById,
	getUserByUsername,
	getUserByEmail,
	createUser,
	updateUsername,
	deleteUserById,
	updateEmail,
	getHashedPasswordById,
	updatePassword,
} from "#/src/queries/users.js";

function signupUser(app: Express) {
	app.post("/api/user", async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		const {username, email, password} = req.body;

		try {
			const parsedSchema = SignupSchema.safeParse(req.body);
			if (!parsedSchema.success) {
				return res.status(400).json({ok: false, error: parsedSchema.error.issues[0].message});
			}

			const hash = await argon2.hash(password, {
				type: argon2.argon2id,
			});

			/* createUser returns id. Let's keep this call here if it is ever needed */
			//const id = await createUser({username, email} as User, hash);
			await createUser({username, email} as User, hash);
			res.status(201).json({ok: true, data: null});
		} catch (error: unknown) {
			if (isDbError(error) && isUniqueViolation(error)) {
				res.status(409).json({ok: false, error: "Username or email already in use"});
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

function modifyUser(app: Express) {
	app.patch("/api/user", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		const {username, email, oldPassword, newPassword} = req.body;
		const id = req.session.userId!;

		if (!username && !email && !newPassword) {
			return res.status(400).json({ok: false, error: "Nothing to update"});
		}

		try {
			const user = await getUserById(id);

			if (username) {
				const parsedUsername = usernameSchema.safeParse(username);
				if (!parsedUsername.success) {
					return res.status(400).json({ok: false, error: parsedUsername.error.issues[0].message});
				}

				if (user!.username === parsedUsername.data) {
					return res
						.status(400)
						.json({ok: false, error: "No change made: New username can not be the same as old username"});
				}

				const usernameExists = await getUserByUsername(username);
				if (usernameExists) {
					return res.status(409).json({ok: false, error: "Username already taken"});
				}

				if ((await updateUsername(username, id)) == false)
					return res.status(500).json({ok: false, error: "Something went wrong"});
			}

			if (email) {
				const parsedEmail = emailSchema.safeParse(email);
				if (!parsedEmail.success) {
					return res.status(400).json({ok: false, error: parsedEmail.error.issues[0].message});
				}

				if (user!.email === email) {
					return res.status(400).json({ok: false, error: "No change made: New email can not be the same as old email"});
				}
				const emailExists = await getUserByEmail(email);
				if (emailExists) {
					return res.status(409).json({ok: false, error: "Email already taken"});
				}

				if ((await updateEmail(email, id)) == false)
					return res.status(500).json({ok: false, error: "Something went wrong"});
			}

			if (newPassword) {
				const parsedPassword = passwordSchema.safeParse(newPassword);
				if (!parsedPassword.success) {
					return res.status(400).json({ok: false, error: parsedPassword.error.issues[0].message});
				}

				const currentPassword = await getHashedPasswordById(id);
				if (!currentPassword) {
					return res.status(500).json({ok: false, error: "Database error"});
				}

				if (!(await argon2.verify(currentPassword, oldPassword))) {
					return res.status(400).json({ok: false, error: "Incorrect password"});
				}

				if (await argon2.verify(currentPassword, newPassword)) {
					return res.status(400).json({ok: false, error: "New Password can not be the same as old password!"});
				}

				const hash = await argon2.hash(newPassword, {
					type: argon2.argon2id,
				});

				if ((await updatePassword(hash, id)) == false)
					return res.status(500).json({ok: false, error: "Something went wrong"});
			}

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

function deleteUser(app: Express) {
	app.delete("/api/user", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const id = req.session.userId!;
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

		const id = req.session.userId!;
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

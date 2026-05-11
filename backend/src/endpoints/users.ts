import type {Express, Request, Response} from "express";
import argon2 from "argon2";
import {SignupSchema, usernameSchema, emailSchema, passwordSchema} from "#/src/validation/schemas.js";
import {isDbError, isUniqueViolation} from "#/src/utils.js";
import type {ApiResponse, User} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";
import {requireAuth} from "#/src/middleware.js";
import userQueryService from "#/src/queries/users.js";

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
			await userQueryService.createUser({username, email} as User, hash);
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
		const {username, email, password, newPassword, newPassword2} = req.body;
		const id = req.session.userId!;

		if (!username && !email && !newPassword) {
			return res.status(400).json({ok: false, error: "Nothing to update"});
		}

		try {
			const user = await userQueryService.getUserWithPasswordById(id);
			if (!user) {
				throw new Error(`User with id: ${id} not found in database`);
			}

			if (!(await argon2.verify(user.hashed_password, password))) {
				return res.status(400).json({ok: false, error: "Incorrect password"});
			}

			if (username) {
				const parsedUsername = usernameSchema.safeParse(username);
				if (!parsedUsername.success) {
					return res.status(400).json({ok: false, error: parsedUsername.error.issues[0].message});
				}

				if (user!.username === parsedUsername.data) {
					return res.status(400).json({ok: false, error: "New username same as current username"});
				}

				const usernameExists = await userQueryService.getUserByUsername(username);
				if (usernameExists) {
					return res.status(409).json({ok: false, error: "Username already taken"});
				}

				if ((await userQueryService.updateUsername(username, id)) == false)
					throw new Error(`Could not update username for id: ${id}`);
			}

			if (email) {
				const parsedEmail = emailSchema.safeParse(email);
				if (!parsedEmail.success) {
					return res.status(400).json({ok: false, error: parsedEmail.error.issues[0].message});
				}

				if (user!.email === email) {
					return res.status(400).json({ok: false, error: "New email same as old email"});
				}

				const emailExists = await userQueryService.getUserByEmail(email);
				if (emailExists) {
					return res.status(409).json({ok: false, error: "Email already taken"});
				}

				if ((await userQueryService.updateEmail(email, id)) == false)
					throw new Error(`Could not update email for id: ${id}`);
			}

			if (newPassword) {
				const parsedPassword = passwordSchema.safeParse(newPassword);
				if (!parsedPassword.success) {
					return res.status(400).json({ok: false, error: parsedPassword.error.issues[0].message});
				}

				if (newPassword !== newPassword2)
					return res.status(400).json({ok: false, error: "The passwords do not match!"});

				if (await argon2.verify(user.hashed_password, newPassword)) {
					return res.status(400).json({ok: false, error: "New Password can not be the same as old password!"});
				}

				const hash = await argon2.hash(newPassword, {
					type: argon2.argon2id,
				});

				if ((await userQueryService.updatePassword(hash, id)) == false)
					throw new Error(`Could not update password for id :${id}`);
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
		const {password} = req.body;
		const id = req.session.userId!;

		try {
			const user = await userQueryService.getUserWithPasswordById(id);
			if (!user) {
				throw new Error(`User with id: ${id} not found in database`);
			}

			if (!(await argon2.verify(user.hashed_password, password))) {
				return res.status(400).json({ok: false, error: "Incorrect password"});
			}

			if ((await userQueryService.deleteUserById(id)) === false) {
				throw new Error(`Could not delete user with id: ${id}`);
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
			const user = await userQueryService.getUserById(id);
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

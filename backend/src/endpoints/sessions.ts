import type {Express, Request, Response} from "express";
import argon2 from "argon2";
import rateLimit from "express-rate-limit";
import {timestampedLog} from "#/src/logging.js";
import {ApiResponse} from "#shared/src/types.js";
import {isDbError} from "#/src/utils.js";
import {requireAuth} from "#/src/middleware.js";
import {getUserByIdentifier} from "#/src/queries/users.js";

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 min (how long to remember requests for)
	limit: 5, // 5 attempts per 15 min
	message: "Too many login attempts, please try again later.",
});

function loginUser(app: Express) {
	app.post("/api/session", limiter, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const {loginIdentifier, password} = req.body;
		if (!loginIdentifier || !password) {
			return res.status(400).json({ok: false, error: "Please fill all the fields"});
		}

		try {
			const user = await getUserByIdentifier(loginIdentifier);
			if (!user) {
				return res.status(401).json({ok: false, error: "Incorrect username or password"});
			}

			const match = await argon2.verify(user.hashed_password, password);

			if (!match) {
				return res.status(401).json({ok: false, error: "Incorrect username or password"});
			}
			// Generate a session and add requesting user's id to the session
			req.session.regenerate((error) => {
				if (error) return res.status(500).json({ok: false, error: "Session error"});

				req.session.userId = user.id;
				req.session.save((error) => {
					if (error) return res.status(500).json({ok: false, error: "Session save failed"});
					res.status(200).json({ok: true, data: null});
				});
			});
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

function logoutUser(app: Express) {
	app.delete("/api/session", requireAuth, (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		req.session.destroy((error) => {
			if (error) {
				return res.status(500).json({ok: false, error: "Logout failed"});
			}
			res.clearCookie("connect.sid");
			res.status(200).json({ok: true, data: null});
		});
	});
}

function getSession(app: Express) {
	app.get("/api/session", requireAuth, (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		res.status(200).json({ok: true, data: null});
	});
}

export default {loginUser, logoutUser, getSession};

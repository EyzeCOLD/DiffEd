import type {Express, Request, Response} from "express";
import {type Pool} from "pg";
import argon2 from "argon2";
import rateLimit from "express-rate-limit";
import {timestampedLog} from "#/src/logging.js";
import {ApiResponse} from "#shared/src/types.js";
import {isDbError} from "#/src/utils.js";
import {requireAuth} from "#/src/middleware.js";

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 min (how long to remember requests for)
	limit: 5, // 5 attempts per 15 min
	message: "Too many login attempts, please try again later.",
});

function loginUser(app: Express, db: Pool) {
	app.post("/api/session", limiter, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const {loginIdentifier, password} = req.body;

		const query = "SELECT * FROM users WHERE username = $1 OR email = $1";
		timestampedLog(`DB QUERY >>> ${query}`);
		timestampedLog(`DB VALUES >>> ${[loginIdentifier]}`);
		try {
			const result = await db.query(query, [loginIdentifier]);

			if (!result.rows.length) {
				return res.status(401).json({ok: false, error: "Incorrect username or password"});
			}

			const user = result.rows[0];
			const match = await argon2.verify(user.hashed_password, password);

			if (!match) {
				return res.status(401).json({ok: false, error: "Incorrect username or password"});
			}
			// Generate a session and add requesting users id to the session
			req.session.regenerate((error) => {
				if (error) {
					return res.status(500).json({ok: false, error: "Session error"});
				}

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

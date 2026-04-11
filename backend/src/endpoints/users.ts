import {type Express} from "express";
import {type Pool} from "pg";
import pgPromise from "pg-promise";
import argon2 from "argon2";
import {SignupSchema} from "../validation/schemas.js";
import {z} from "zod";
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 min (how long to remember requests for)
	limit: 5, // 5 attempts per 15 min
	message: "Too many login attempts, please try again later.",
});

function signupUser(app: Express, db: Pool) {
	app.post("/api/signup", async (req, res) => {
		const {username, email, password} = req.body;

		try {
			SignupSchema.parse({username, email, password});
			const hash = await argon2.hash(password, {
				type: argon2.argon2id,
			});

			await db.query("INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3)", [
				username,
				email,
				hash,
			]);

			console.log("Successfully created user");
			res.status(201).send();
		} catch (err: unknown) {
			if (err instanceof pgPromise.errors.QueryResultError && err.code === (23505 as number)) {
				console.log("Client tried to create user with already existing name or email");
				res.status(409).json({error: "Username or email already in use"});
			} else if (err instanceof z.ZodError) {
				const msg = err.issues[0].message;
				res.status(400).json({error: msg});
			} else {
				console.error("Error creating user", err);
				res.status(500).json({error: "Internal server error"});
			}
		}
	});
}

function loginUser(app: Express, db: Pool) {
	app.post("/api/session", limiter, async (req, res) => {
		const {loginIdentifier, password} = req.body;

		try {
			const result = await db.query("SELECT * FROM users WHERE username = $1 OR email = $1", [loginIdentifier]);

			if (result.rows.length === 0) {
				console.log("No such user:", loginIdentifier);
				return res.status(401).json({error: "Incorrect username or password"});
			}

			const user = result.rows[0];
			const match = await argon2.verify(user.hashed_password, password);

			if (!match) {
				console.log("Invalid password for existing user");
				return res.status(401).json({error: "Incorrect username or password"});
			}
			console.log("Authentication success!");
			// Generate a session and add requesting users id and username to the session
			req.session.regenerate((err) => {
				if (err) return res.status(500).json({error: "Session error"});

				req.session.userId = user.id;
				req.session.username = user.username;

				req.session.save((err) => {
					if (err) return res.status(500).json({error: "Session save failed"});

					res.status(200).json({message: "Login successful"});
				});
			});
		} catch (err) {
			console.log("Error authenticating user: ", err);
			res.status(500).json({error: "Internal server error"});
		}
	});
}

function logoutUser(app: Express) {
	app.delete("/api/session", (req, res) => {
		req.session.destroy((err) => {
			if (err) return res.status(500).json({error: "Logout failed"});
			res.clearCookie("connect.sid");
			res.status(200).send();
		});
	});
}

// TODO: This function could query and return the user data
function getSession(app: Express) {
	app.get("/api/session", (req, res) => {
		if (req.session.userId) {
			res.status(200).send();
		} else {
			res.status(404).send();
		}
	});
}

export default {signupUser, loginUser, logoutUser, getSession};

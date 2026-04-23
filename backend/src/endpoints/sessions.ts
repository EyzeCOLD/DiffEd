import {type Express} from "express";
//import {type Pool} from "pg";
import argon2 from "argon2";
import rateLimit from "express-rate-limit";
import z from "zod";
import {loginSchema} from "#/src/validation/schemas.js";
import {User} from "#shared/src/types.js";
import {getUserByIdentifier} from "../queries.js";
import passport from "passport";

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 min (how long to remember requests for)
	limit: 5, // 5 attempts per 15 min
	message: "Too many login attempts, please try again later.",
});

function login(app: Express) {
	app.post("/api/session", limiter, async (req, res) => {
		try {
			const input = loginSchema.parse(req.body);

			const identifier = "email" in input ? input.email : input.username;

			const user = await getUserByIdentifier(identifier);

			if (!user) {
				return res.status(401).json({error: "Incorrect username or password"});
			}

			const isPasswordValid = await argon2.verify(user.password || "", input.password);
			if (!isPasswordValid) {
				return res.status(401).json({error: "Incorrect username or password"});
			}

			req.session.regenerate((err) => {
				if (err) return res.status(500).json({error: "Session error"});

				req.session.userId = user.id;

				req.session.save((err) => {
					if (err) return res.status(500).json({error: "Session save failed"});

					res.status(200).json({message: "Login successful"});
				});
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				const msg = err.issues[0].message;
				return res.status(400).json({error: msg});
			}
			res.status(500).json({error: "Internal server error"});
		}
	});
	// Google auth routes
	app.get("/api/login/google", (req, res) => {
		const url = passport.authenticate("google");
		res.json({url: url.toString()});
	});

	app.get(
		"/api/oauth2/redirect/google",
		passport.authenticate("google", {failureRedirect: "/api/auth/failure"}),
		(req, res) => {
			if (!req.user) {
				return res.status(401).json({error: "Authentication failed"});
			}

			req.session.userId = (req.user as User).id;

			res.status(200).send();
		},
	);

	app.get("/api/auth/failure", (req, res) => {
		res.status(401).json({error: "Authentication failed"});
	});
}

//function loginUser(app: Express, db: Pool) {
//app.post("/api/session", limiter, async (req, res) => {
//const {loginIdentifier, password} = req.body;
//
//try {
//const result = await db.query("SELECT * FROM users WHERE username = $1 OR email = $1", [loginIdentifier]);
//
//if (result.rows.length === 0) {
//console.log("No such user:", loginIdentifier);
//return res.status(401).json({error: "Incorrect username or password"});
//}
//
//const user = result.rows[0];
//const match = await argon2.verify(user.hashed_password, password);
//
//if (!match) {
//console.log("Invalid password for existing user");
//return res.status(401).json({error: "Incorrect username or password"});
//}
//// Generate a session and add requesting users id to the session
//req.session.regenerate((err) => {
//if (err) return res.status(500).json({error: "Session error"});
//
//req.session.userId = user.id;
//
//req.session.save((err) => {
//if (err) return res.status(500).json({error: "Session save failed"});
//
//res.status(200).json({message: "Login successful"});
//});
//});
//} catch (err) {
//console.log("Error authenticating user: ", err);
//res.status(500).json({error: "Internal server error"});
//}
//});
//}

function logoutUser(app: Express) {
	app.delete("/api/session", (req, res) => {
		req.session.destroy((err) => {
			if (err) return res.status(500).json({error: "Internal server error"});
			res.clearCookie("connect.sid");
			res.status(200).send();
		});
	});
}

function getSession(app: Express) {
	app.get("/api/session", (req, res) => {
		if (req.session.userId) {
			res.status(200).send();
		} else {
			res.status(404).send();
		}
	});
}

export default {/*loginUser,*/ login, logoutUser, getSession};

import {type Express} from "express";
import {type Pool} from "pg";
import pgPromise from "pg-promise";
import argon2 from "argon2";
import {SignupSchema} from "../validation/schemas.js";
import {z} from "zod";

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

const modifyUser = (app: Express, db: Pool) => {
	app.patch("/api/user", async (req, res) => {
		if (!req.session.userId) {
            return res.status(404).json({error: "Unauthorized"});
        }

        const { username, email } = req.body;
        const id = req.session.userId;

        if (!username && !email) {
            return res.status(400).json({error: "Nothing to update"});
        }

        try {
            if (username) {
                const isUsernameTaken = await db.query(
                    "SELECT 1 FROM users WHERE username = $1 AND id != $2",
                    [username, id]
                );
                if (isUsernameTaken.rows.length > 0) {
                    throw new Error("Username already taken");
                }
                await db.query(
                    "UPDATE users SET username = $1 WHERE id = $2",
                    [username, id]
                );
            }
            if (email) {
                //TODO: Add email validity checks
                const isEmailTaken = await db.query(
                    "SELECT 1 FROM users WHERE email = $1 AND id != $2",
                    [email, id]
                );
                if (isEmailTaken.rows.length > 0) {
                    throw new Error("Email already taken");
                }
                await db.query(
                    "UPDATE users SET email = $1 WHERE id = $2",
                    [email, id]
                );
            }

            if (username) {
                req.session.username = username;
                await new Promise<void>((resolve, reject) => {
                    req.session.save((err) => err ? reject(err) : resolve());
                });
            }

            res.status(200).send();
        } catch (err) {
            res.status(400).json({error: err});
        }
	});
};

function deleteUser(app: Express, db: Pool) {
	app.delete("/api/user", async (req, res) => {
		if (!req.session.userId) {
			return res.status(404).json({error: "Unauthorized"});
        }

        const id = req.session.userId;
        try {
            await db.query("DELETE FROM users WHERE id = $1", [id]);

            res.clearCookie("connect.sid");
            res.status(200).send();
        } catch (err) {
            console.log("Error deleting user: ", err);
            res.status(400).json({error: "Couldn't delete use at this time"});
        }
	});
}

function getUser(app: Express, db: Pool) {
    app.get("/api/user", async (req, res) => {
        if (!req.session.userId) {
            return res.status(404).json({error: "Unauthorized"});
        }

        const id = req.session.userId;
        try {
            const result = await db.query("SELECT username, email FROM users WHERE id = $1", [id]);

            if (result.rows.length === 0) {
                throw new Error("No query result");
            }
            console.log(result.rows[0]);

            const obj = {
                username: result.rows[0].username,
                email: result.rows[0].email,
            };

            res.status(200).json(obj);
        } catch (err) {
            console.log("Error fetching user: ", err);
            res.status(400).json({error: "Internal Server error"});
        }
	});
}

export default {signupUser, deleteUser, getUser, modifyUser};

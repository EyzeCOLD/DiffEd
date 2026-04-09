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

//const modifyUser = (app: Express, db: Pool) => {
//    app.put
//}

const deleteUser = (app: Express, db: Pool) => {
    app.delete("/api/user", async (req, res) => {
        if (req.session.userId) {
            const user = req.session.userId;
            try {
                await db.query("DELETE FROM users WHERE id = $1", [user]);

                res.clearCookie("connect.sid");
                res.status(200).send();
            } catch (err) {
                console.log("Error deleting user: ", err);
                res.status(400).json({ error: "Couldn't delete use at this time" });
            }
        } else {
            res.status(404).json({ error: "User not found" });
        }
    });
}

const getUser = (app: Express, db: Pool) => {
    app.get("/api/user", async (req, res) => {
        if (req.session.userId) {
            const user = req.session.userId;
            try {
                const result = await db.query("SELECT username, email FROM users WHERE id = $1", [user]);

                if (result.rows.length === 0) {
                    throw new Error("No query result");
                }
                console.log(result.rows[0])

                const obj = {
                    username: result.rows[0].username,
                    email: result.rows[0].email,
                }

                res.status(200).json(obj);

            } catch (err) {
                console.log("Error fetching user: ", err);
                res.status(400).json({ error: "Internal Server error" });
            }
        } else {
            res.status(404).json({ error: "User not found" });
        }
    });
}

export default {signupUser, deleteUser, getUser};

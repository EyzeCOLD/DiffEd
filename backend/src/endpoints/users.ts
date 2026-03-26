import { type Express } from "express";
import { type Pool } from "pg";
import { timestampedLog } from "../logging.js";
//
//
//Resolve the stuff below and decide which to use
//import { randomBytes, pbkdf2, timingSafeEqual } from "crypto";
import * as crypto from "crypto";

const signupUser = (app: Express, db: Pool) => {
    app.post("/api/signup", async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);

        try {
            const salt = crypto.randomBytes(16);
            const newUsername = req.body.username;
            const newUserEmail = req.body.email;
            let newHashedPassword;
            crypto.pbkdf2(req.body.password, salt, 50000, 64, 'sha512', (err, hashedPassword) => {
                if (err) throw err;
                newHashedPassword = hashedPassword;
            });
            const result = await db.query(
                'INSERT INTO users (username, email, hashed_password, salt) VALUES ($1, $2, $3, $4)',
                [newUsername, newUserEmail, newHashedPassword, salt]
            )
            //the row below should be changed. Not sending any information from db
            res.status(201).send();
        } catch (err) {
            console.log('Error creating a user', err);
            res.status(500).send();
        }
    }); 
};

const loginUser = (app: Express, db: Pool) => {
    app.get("/api/login", async (req, res) => {
        timestampedLog("Received request to " + req.baseUrl);

        try {
            let result = await db.query(
                'SELECT * FROM users WHERE username = ?', [req.body.userCredentials] 
            );
            if (result.rows.length === 0) {
                result = await db.query(
                    'SELECT * FROM users WHERE email = ?', [req.body.userCredentials]
                );
                if (result.rows.length === 0) {
                    throw new Error('No such user');
                }
            }
            const user = result.rows[0];

            crypto.pbkdf2(req.body.password, user.salt, 50000, 64, 'sha512', (err, inputPassword) => {
                if (err) throw err;
                if (crypto.timingSafeEqual(user.hashed_password, inputPassword)) {
                    timestampedLog("Authentication success!");
                } else {
                    throw new Error("Incorrect username or password");
                }
            });
            res.status(200).send();
        } catch (err) {
            console.log(`Error: ${err}`);
            res.status(401).json({ error: 'Authentication failed' });
        }
    });     
};

export default { signupUser , loginUser };

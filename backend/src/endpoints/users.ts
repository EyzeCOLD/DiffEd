import { type Express } from "express";
import { type Pool } from "pg";
import { timestampedLog } from "../logging.js";
import bcrypt from "bcrypt";

const signupUser = (app: Express, db: Pool) => {
    app.post("/api/signup", async (req, res) => {
        const saltRounds = 12;

        try {
            const newUsername = req.body.username;
            const newUserEmail = req.body.email;
            bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
                if (err) throw err;
                db.query(
                    'INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3)',
                    [newUsername, newUserEmail, hash]
                )
                console.log('Successfully created user');
                res.status(201).send();
            });
        } catch (err) {
            console.error('Error creating user', err);
            res.status(500).send();
        }
    }); 
};

const loginUser = (app: Express, db: Pool) => {
    app.post("/api/login", async (req, res) => {

        try {
            let result = await db.query(
                'SELECT * FROM users WHERE username = $1', [req.body.user] 
            );
            if (result.rows.length === 0) {
                result = await db.query(
                    'SELECT * FROM users WHERE email = $1', [req.body.user]
                );
                if (result.rows.length === 0) {
                    console.log('No such user');
                    return res.status(401).send('Incorrect username or password');
                }
            }
            
            const user = result.rows[0];
            console.log(user);

            bcrypt.compare(req.body.password, user.hashed_password, (err, result) => {
                if (err) throw err;
                console.log(result);
                if (result) {
                    console.log("Authentication success!");
                    return res.status(202).send('Login successful');
                } else {
                    console.log('Invalid password for existing user');
                    return res.status(401).send('Incorrect username or password');
                }
            });

        } catch (err) {
            console.error('Error authenticating user: ', err);
            res.status(500).send();
        }
    });     
};

export default { signupUser , loginUser };

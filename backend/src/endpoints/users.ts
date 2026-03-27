import { type Express } from "express";
import { type Pool } from "pg";
import { timestampedLog } from "../logging.js";
import bcrypt from "bcrypt";

const signupUser = (app: Express, db: Pool) => {
    app.post("/api/signup", async (req, res) => {
        const saltRounds = 10;

        try {
            const newUsername = req.body.username;
            const newUserEmail = req.body.email;
            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) throw err;
                bcrypt.hash(req.body.password, salt, (err, hash) => {
                    if (err) throw err;
                    db.query(
                        'INSERT INTO users (username, email, hashed_password, salt) VALUES ($1, $2, $3, $4)',
                        [newUsername, newUserEmail, hash, salt]
                    )
                });
            });
            res.status(201).send();
        } catch (err) {
            console.error('Error creating a user', err);
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
                    return res.status(401).send('No such user');
                }
            }
            
            const user = result.rows[0];
            console.log(user);

            bcrypt.hash(req.body.password, user.salt, (err, hash) => {
                if (err) throw err;
                bcrypt.compare(hash, user.password, (err, result) => {
                    if (err) throw err;
                    if (result === true) {
                        console.log("Authentication success!");
                    } else {
                        throw new Error("Incorrect username or password");
                    }
                });
            });
            res.status(200).send();
            //Fix it so error should only be thrown if something fails functionally
            //If wrong username or password -> send bad password/username response
        } catch (err) {
            console.error(`Error: ${err}`);
            res.status(401).json({ error: 'Authentication failed' });
        }
    });     
};

export default { signupUser , loginUser };

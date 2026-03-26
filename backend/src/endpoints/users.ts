import { type Express } from "express";
import { type Pool } from "pg";
import { randomBytes, pbkdf2, timingSafeEqual } from "crypto";
import { timestampedLog } from "../logging.js";

const signupUser = (app: Express, db: Pool) => {
    app.post("/api/signup", async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);
		// console.log(`getFiles req ${req} res ${res}`);

        try {
            //NOTE: should we only have one secret salt shared amongst user?
            const salt = randomBytes(16);
            const newUsername = req.body.username;
            const newUserEmail = req.body.email;
            let hashedPassword;
            pbkdf2(req.body.password, salt, 50000, 64, 'sha512', (err, hashedPassword) => {
                if (err) throw err;
            });
            const result = await db.query(
                'INSERT INTO users (username, email, hashed_password, salt) VALUES ($1, $2, $3, $4)',
                [newUsername, newUserEmail, hashedPassword, salt]
            )
            //the row below should be changed. Not sending any information from db
            res.status(201).send(result.rows[0]);
        } catch (err) {
            console.log('Error creating a user', err);
            res.status(500).send()
        }
    }); 
};

const loginUser = (app: Express, db: Pool) => {
    app.get("/api/login", async (req, res) => {
        timestampedLog("Received request to " + req.baseUrl);
        // console.log(`getFiles req ${req} res ${res}`);
        try {
            let result;
            result = await db.query(
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

            let inputPassword;
            pbkdf2(req.body.password, result.salt, 50000, 64, 'sha512', (err, inputPassword) => {
                if (err) throw err;
            });
            if (timingSafeEqual(result.hashed_password, inputPassword)) {
                timestampedLog("Authentication success!");
            } else {
                throw new Error("Incorrect username or password");
            }
        } catch (err) {
            timestampedLog("Authentication error: " + err.message);
            res.status(401).json({ error: 'Authentication failed' });
        }
    });     
};

export default { signupUser , loginUser };
//const queryUser = (app: Express, db: Pool) => {
    //app.get("/api/users/:userId", async (req,res) => {
        //timestampedLog("Received request to " + req.baseUrl);
        //const userId = z.coerce.number().safeParse(req.params.userId);
        //if (!userId.success) {
            //res.status(400).send("Invalid user ID");
            //return;
        //}
        //try {
            //const id: number = userId.data;
        //}
    //}
//};

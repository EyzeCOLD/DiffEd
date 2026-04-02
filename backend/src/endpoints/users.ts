import { type Express } from "express";
import { type Pool } from "pg";
import argon2 from "argon2";
import rateLimit from 'express-rate-limit';
import {UserSignupSchema} from "../validation/schemas.js";
import { z } from "zod";
import passport from "passport";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min (how long to remember requests for)
    limit: 500, // TODO! limit each IP to 5 login requests per windowMs, 500 for developing purposes
    message: 'Too many login attempts, please try again later.'
});

const signupUser = (app: Express, db: Pool) => {
    app.post("/api/signup", async (req, res) => {

        const { username, email, password } = req.body;

        try {
            UserSignupSchema.parse({ username, email, password });
            const hash = await argon2.hash(password, {
                type: argon2.argon2id,
            });

            await db.query(
                'INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3)',
                [username, email, hash]
            );

            console.log('Successfully created user');
            res.status(201).send('User Created');

        } catch (err: any) {
            if (err.code === '23505') {
                console.log('Client tried to create a user with already existing name or email');
                res.status(409).send('Username or email already in use');
            } else if (err instanceof z.ZodError) {
                const msg = err.issues[0].message;
                res.status(401).send(msg);
            }
            else {
                console.error('Error creating user', err);
                res.status(500).send('Internal server error');
            }
        }
    }); 
};

const loginUser = (app: Express) => {
    app.post("/api/login", passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login'
    }));
};

//const loginUser = (app: Express, db: Pool) => {
    //app.post("/api/login", limiter, async (req, res) => {
//
        //const { loginIdentifier, password } = req.body;
//
        //try {
            //const result = await db.query(
                //'SELECT * FROM users WHERE username = $1 OR email = $1', [loginIdentifier] 
            //);
//
            //if (result.rows.length === 0) {
                //console.log('No such user:', loginIdentifier);
                //return res.status(401).send('Incorrect username or password');
            //}
            //
            //const match = await argon2.verify(result.rows[0].hashed_password, password);
//
            //if (match) {
                //console.log("Authentication success!");
                //// TODO: Generate and return a token or session ID
                //res.status(200).send('Login successful');
                ////res.status(200).json({ message: 'login successful', token: ID, userID: result.rows[0].id });
            //} else {
                //console.log('Invalid password for existing user');
                //res.status(401).send('Incorrect username or password');
            //}
//
        //} catch (err) {
            //console.log('Error authenticating user: ', err);
            //res.status(500).send('Internal server error');
        //}
    //});     
//};

const logout = (app: Express) => {
    app.post('/api/logout', (req, res, next) => {
      req.logout((err) => {
            if (err) { return next(err); }
            res.redirect('/');
      }); 
    });
}

export default { signupUser , loginUser, logout };

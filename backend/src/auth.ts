import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import argon2 from "argon2";
import { type Pool } from "pg";
import { type Express } from "express";

const configurePassport = (app: Express, db: Pool) => {
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(
        async (loginIdentifier, password, cb) => {
            try {
                const result = await db.query(
                    'SELECT * FROM users WHERE username = $1 OR email = $1',
                    [loginIdentifier]
                );
                if (result.rows.length === 0) {
                    return cb(null, false, { message: "Incorrect username." });
                }
                const match = await argon2.verify(result.rows[0].hashed_password, password);
               if (!match) {
                   return cb(null, false, { message: "Incorrect password." });
                } 
                return cb(null, result.rows[0]);
            } catch (e) {
                return cb(e);
            }
        }
    ));

    //If this ever works the 'any' below needs to be changed to usertype
    passport.serializeUser((user: any, cb) => {
        cb(null, { id: user.id, username: user.username });
    });

    passport.deserializeUser((user: any, cb) => {
        return cb(null, user);
    });
}

export default configurePassport;

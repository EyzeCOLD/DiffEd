import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import {postgres} from "./postgres.js";
import {SESSION_SECRET} from "#/src/env.js";

// This extrends the express-session SessionData. Stored in database.
declare module "express-session" {
	interface SessionData {
		userId: number;
	}
}

const pgSession = connectPgSimple(session);

const sessionConfig = session({
	store: new pgSession({
		pool: postgres,
		tableName: "user_sessions",
	}),
	secret: SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 24 * 60 * 60 * 1000, // 1 day
		httpOnly: true,
		//secure: true, //for https
	},
});

export default sessionConfig;

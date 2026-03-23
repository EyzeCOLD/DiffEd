import path from "node:path";
import express from "express";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";

import authEndpoint from "./endpoints.auth";
import passport from 'passport';
import session from 'express-session';

const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

Endpoints.getFiles(app, postgres);
Endpoints.getFileById(app, postgres);
Endpoints.UserFiles(app, postgres);
Endpoints.editFile(app, postgres);

// Catch-all to serve the frontend, needed for subroutes.
app.get("/*splat", function (request, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

// The following lines will add the session support to the app and then
// authenticate the session
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './var/db' })
}));
app.use(passsport.authenticate('session'));

app.use('/', indexRouter);
app.use('/', authRouter);

app.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

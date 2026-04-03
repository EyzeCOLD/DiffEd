import path from "node:path";
import express from "express";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";
import UserEndpoints from "./endpoints/users.js";

import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const app = express();
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

declare module "express-session" {
    interface SessiosData {
        userId: string;
        username: string;
    }
}

const pgSession = connectPgSimple(session);

app.use(session({
    store: new pgSession({
        pool: postgres,
        tableName: 'user_sessions',
    }),
    secret: 'sessionkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        //secure: true,
    }
}));

Endpoints.getFiles(app, postgres);
Endpoints.getFileById(app, postgres);
Endpoints.uploadFile(app, postgres);
Endpoints.editFile(app, postgres);
Endpoints.uploadMultipleFiles(app, postgres);
Endpoints.deleteFile(app, postgres);

UserEndpoints.signupUser(app, postgres);
UserEndpoints.loginUser(app, postgres);
UserEndpoints.logoutUser(app);
UserEndpoints.temporary(app);

// Catch-all to serve the frontend, needed for subroutes.
app.get("/*splat", function (request, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

app.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

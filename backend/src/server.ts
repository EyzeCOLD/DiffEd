import path from "node:path";
import express from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";
import UserEndpoints from "./endpoints/users.js";

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import {collabSocket} from "./endpoints/collabSocket.js";

const api = express();
const server = createServer(api);
const sockets = new Server(server, {cors: {origin: "*"}});
collabSocket(sockets, postgres);

/*=======USER SESSION==============*/

declare module "express-session" {
    interface SessionData {
        userId: number;
        username: string;
    }
}

const pgSession = connectPgSimple(session);

api.use(session({
    store: new pgSession({
        pool: postgres,
        tableName: 'user_sessions',
    }),
    secret: 'sessionkey', //TODO! Change to process.env.SECRET_VAR
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        //secure: true, //for https
    }
}));

/*=========USER SESSION END==========*/

api.use(express.static("../frontend/dist"));
api.use(express.json());
api.use(helmetSecurity());

Endpoints.getFiles(api, postgres);
Endpoints.getFileById(api, postgres);
Endpoints.uploadFile(api, postgres);
Endpoints.editFile(api, postgres);
Endpoints.uploadMultipleFiles(api, postgres);
Endpoints.deleteFile(api, postgres);

UserEndpoints.signupUser(api, postgres);
UserEndpoints.loginUser(api, postgres);
UserEndpoints.logoutUser(api);
UserEndpoints.getSession(api);

// Catch-all to serve the frontend, needed for subroutes.
api.get("/*splat", function (request, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

server.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

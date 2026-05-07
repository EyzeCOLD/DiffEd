import "./env.js";
import path from "node:path";
import express from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import helmetSecurity from "helmet";
import passport from "passport";
import {postgres} from "./postgres.js";
import sessionConfig from "./sessionConfig.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";
import UserEndpoints from "./endpoints/users.js";
import SessionEndpoints from "./endpoints/sessions.js";
import OAuthEndpoints from "./endpoints/oauth.js";
import workspaceEndpoints from "./endpoints/workspace.js";
import "./passportConfig.js";

import {initCollabSocket} from "./endpoints/collabSocket.js";

const app = express();
app.set("trust proxy", true); // Required so Express reads the Host header forwarded by Nginx, needed for passport-oauth2 relative callbackURL resolution
const server = createServer(app);
const sockets = new Server(server, {cors: {origin: "*"}});
const collabApi = initCollabSocket(sockets, postgres);

app.use(sessionConfig);
app.use(passport.initialize());
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

Endpoints.getFiles(app, postgres);
Endpoints.getFileById(app, postgres);
Endpoints.createNewFile(app, postgres);
Endpoints.uploadFiles(app, postgres);
Endpoints.deleteFile(app, postgres);
Endpoints.downloadFile(app, postgres);

UserEndpoints.signupUser(app);
UserEndpoints.modifyUser(app);
UserEndpoints.deleteUser(app);
UserEndpoints.getUser(app);
SessionEndpoints.loginUser(app);
SessionEndpoints.logoutUser(app);
SessionEndpoints.getSession(app);
OAuthEndpoints.githubAuthStart(app);
OAuthEndpoints.githubAuthCallback(app);
OAuthEndpoints.setGithubUsername(app);
OAuthEndpoints.githubUnlink(app);

workspaceEndpoints.createWorkspace(app, collabApi);
workspaceEndpoints.getWorkspace(app, collabApi);

// Catch-all to serve the frontend, needed for subroutes.
app.get("/*splat", function (_, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

server.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

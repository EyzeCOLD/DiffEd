import "./env.js";
import path from "node:path";
import express from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import sessionConfig from "./sessionConfig.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";
import UserEndpoints from "./endpoints/users.js";
import SessionEndpoints from "./endpoints/sessions.js";
import workspaceEndpoints from "./endpoints/workspace.js";

import {initCollabSocket} from "./endpoints/collabSocket.js";

const app = express();
const server = createServer(app);
const sockets = new Server(server, {cors: {origin: "*"}});
const collabApi = initCollabSocket(sockets, postgres);

app.use(sessionConfig);
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

Endpoints.getFiles(app, postgres);
Endpoints.getFileById(app, postgres);
Endpoints.uploadFiles(app, postgres);
Endpoints.deleteFile(app, postgres);

UserEndpoints.signupUser(app);
UserEndpoints.modifyUser(app);
UserEndpoints.deleteUser(app);
UserEndpoints.getUser(app);
SessionEndpoints.loginUser(app);
SessionEndpoints.logoutUser(app);
SessionEndpoints.getSession(app);

workspaceEndpoints.createWorkspace(app, collabApi);
workspaceEndpoints.getWorkspace(app, collabApi);

// Catch-all to serve the frontend, needed for subroutes.
app.get("/*splat", function (_, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

server.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

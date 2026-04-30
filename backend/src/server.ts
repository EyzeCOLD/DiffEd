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

import {collabSocket} from "./endpoints/collabSocket.js";

const api = express();
const server = createServer(api);
const sockets = new Server(server, {cors: {origin: "*"}});
collabSocket(sockets, postgres);

api.use(sessionConfig);
api.use(express.static("../frontend/dist"));
api.use(express.json());
api.use(helmetSecurity());

Endpoints.getFiles(api, postgres);
Endpoints.getFileById(api, postgres);
Endpoints.createNewFile(api, postgres);
Endpoints.uploadFiles(api, postgres);
Endpoints.deleteFile(api, postgres);
Endpoints.downloadFile(api, postgres);

UserEndpoints.signupUser(api);
UserEndpoints.modifyUser(api);
UserEndpoints.deleteUser(api);
UserEndpoints.getUser(api);
SessionEndpoints.loginUser(api);
SessionEndpoints.logoutUser(api);
SessionEndpoints.getSession(api);

// Catch-all to serve the frontend, needed for subroutes.
api.get("/*splat", function (_, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

server.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

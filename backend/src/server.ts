import path from "node:path";
import express from "express";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";
import UserEndpoints from "./endpoints/users.js";

const app = express();
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

Endpoints.getFiles(app, postgres);
Endpoints.getFileById(app, postgres);
Endpoints.uploadFile(app, postgres);
Endpoints.editFile(app, postgres);
Endpoints.uploadMultipleFiles(app, postgres);

UserEndpoints.signupUser(app, postgres);
UserEndpoints.loginUser(app, postgres);

// Catch-all to serve the frontend, needed for subroutes.
app.get("/*splat", function (request, response) {
	response.sendFile(path.join(process.cwd(), "/../frontend/dist/index.html"));
});

app.listen(3000, () => {
	timestampedLog("Server online at http://localhost:8080");
});

import express from "express";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import {timestampedLog} from "./logging.js";
import Endpoints from "./endpoints/files.js";

const app = express();
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

Endpoints.getFiles(app, postgres);
Endpoints.getFileById(app, postgres);
Endpoints.UserFiles(app, postgres);

app.listen(3000, () => {
	timestampedLog("Server online at http://localhost:80");
});

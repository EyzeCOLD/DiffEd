import express from "express";
import helmetSecurity from "helmet";
import {postgres} from "./postgres.js";
import {getPlaceholder} from "./endpoints/getPlaceholder.js";
import {timestampedLog} from "./logging.js";

const app = express();
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

getPlaceholder(app, postgres);

app.listen(3000, () => {
	timestampedLog("Server online at http://localhost:80");
});

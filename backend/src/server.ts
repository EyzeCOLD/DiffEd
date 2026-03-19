import express from "express";
import helmetSecurity from "helmet";
// import {postgres} from "./postgres.js";
import {getPlaceholder} from "./endpoints/getPlaceholder";
import {timestampedLog} from "./logging";
import { unknownEndpoint } from "./endpoints/test";

const app = express();
app.use(express.static("../frontend/dist"));
app.use(express.json());
app.use(helmetSecurity());

app.use(unknowEndpoint);
getPlaceholder(app /*, postgres*/);

app.listen(3000, () => {
	timestampedLog("Server online at http://localhost:80");
});

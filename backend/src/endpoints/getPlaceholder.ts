import {type Express} from "express";
// import {type Pool} from "pg";
import {timestampedLog} from "../logging.js";

export function getPlaceholder(app: Express /*, db: Pool*/) {
	app.get("/api/placeholder", async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);
		res.status(200).json();
	});
}

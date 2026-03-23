import {type Express} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "../logging.js";
import {UserFileSchema} from "../validation/schemas.js";
import z from "zod";

const getFiles = (app: Express, db: Pool) => {
	app.get("/api/files", async (req, res) => {
		// try {
		timestampedLog("Received request to " + req.baseUrl);
		// console.log(`getFiles req ${req} res ${res}`);

		try {
			// todo validate user who wants files and send only the ones they have access to
			const result = await db.query(`SELECT * FROM files`);

			res.status(200).send(result.rows);
		} catch (error) {
			console.log(`Error: ${error}`);
			res.status(500).send();
		}

		// @TODO get auth stuff
		// testing
		// res.status(200).sendFile("/backend/test.txt");
		// } catch (err) {
		// }
	});
};

const getFileById = (app: Express, db: Pool) => {
	app.get("/api/files/:fileId", async (req, res) => {
		// try {
		timestampedLog("Received request to " + req.baseUrl);
		// console.log("getFiles req", req, "res", res);
		// console.log(`params.file ${req.params.file}`);
		// @TODO get auth stuff
		const fileId = z.coerce.number().safeParse(req.params.fileId);
		if (!fileId.success) {
			res.status(400).send("Invalid file ID");
			return;
		}

		try {
			const id: number = fileId.data;
			const result = await db.query("SELECT * FROM files WHERE id = $1", [id]);
			// console.log("result\n", result, "\n-------");
			if (result.rowCount != 1) {
				console.log("Not found");
				res.status(403).send();
			} else {
				res.status(200).send(result.rows[0]);
			}
			// console.log("rows >>\n", result.rows, "\n<<");
		} catch (error) {
			console.log(`Error: ${error}`);
			res.status(500).send();
		}
	});
};

const UserFiles = (app: Express, db: Pool) => {
	app.post("/api/files", async (req, res) => {
		// console.log(`req ${req} res ${res}`);
		// console.log("req:", req, "res:", res);
		const parsedBody = UserFileSchema.safeParse(req.body);
		if (parsedBody.success) {
			try {
				const result = await db.query("INSERT INTO files (id, name, content) VALUES ($1, $2, $3)", [
					parsedBody.data.id,
					parsedBody.data.name,
					parsedBody.data.content,
				]);
				res.status(201).send(result.rows[0]);
			} catch (error) {
				console.log("Query failed:", error);
				res.status(500).send();
			}
		} else {
			console.log("bad POST request", parsedBody.error);
			res.status(400).send();
		}
		// a	wait client.query('UPDATE rooms SET room = $1', [imgBuffer])
		// const files = req.body;
	});
};

const editFile = (app: Express, db: Pool) => {
	app.put("/api/files/:fileId", async (req, res) => {
		// console.log(`req ${req} res ${res}`);
		// console.log("req:", req, "res:", res);

		const fileId = z.coerce.number().safeParse(req.params.fileId);
		if (!fileId.success) {
			res.status(400).send("Invalid file ID");
			return;
		}

		const parsedBody = UserFileSchema.safeParse(req.body);
		if (parsedBody.success) {
			try {
				const result = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3", [
					parsedBody.data.name,
					parsedBody.data.content,
					fileId.data,
				]);
				res.status(200).send(result.rows[0]);
			} catch (error) {
				console.log("Query failed:", error);
				res.status(500).send();
			}
		} else {
			console.log("bad PUT request", parsedBody.error);
			res.status(400).send();
		}
	});
};

export default {getFiles, getFileById, UserFiles, editFile};

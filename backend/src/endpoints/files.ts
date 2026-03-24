import {type Express} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "#/src/validation/schemas.js";

import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

import z from "zod";

const getFiles = (app: Express, db: Pool) => {
	app.get("/api/files", async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);
		// console.log(`getFiles req ${req} res ${res}`);

		try {
			// todo validate user who wants files and send only the ones they have access to
			timestampedLog("Sent SELECT query to DB: all files");
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
			timestampedLog(`Sent SELECT query to DB: id:[${id}]`);

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

// should maybe be called uploaFiles if we do that functionality
const uploadFile = (app: Express, db: Pool) => {
	app.post("/api/files", async (req, res) => {
		// the front end could possibly check if a filename is valid (no repeats for a user/project)

		const parsedBody = UserFileSchema.safeParse(req.body);
		if (parsedBody.success) {
			try {
				// temporary duplicate check here. this should probably be done in the frontend

				timestampedLog(`Sent INSERT query to DB: id:[${parsedBody.data.id}] name: '${parsedBody.data.name}'`);
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

const uploadMultipleFiles = (app: Express, db: Pool) => {
	app.post("/api/upload", upload.array("file", 2000), async (req, res) => {
		console.log(req.body);
		console.log(req.files);
		const buffer: Buffer = req.files[0].buffer;
		console.log(buffer.toString());

		// the front end could possibly check if a filename is valid (no repeats for a user/project)
		timestampedLog("Multifile upload test ");
		res.status(200).send();
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
				timestampedLog(`Sent UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`);
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

export default {getFiles, getFileById, uploadFile, uploadMultipleFiles, editFile};

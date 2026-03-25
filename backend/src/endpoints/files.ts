import {type Express} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "#/src/validation/schemas.js";
import z from "zod";
import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const getFiles = (app: Express, db: Pool) => {
	app.get("/api/files", async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);
		// console.log(`getFiles req ${req} res ${res}`);

		try {
			// @TODO validate user who wants files and send only the ones they have access to
			timestampedLog("Sent SELECT query to DB: all files");
			const result = await db.query(`SELECT * FROM files`);
			// console.log(result.rows);
			return res.status(200).send(result.rows);
		} catch (error) {
			console.log(`Error: ${error}`);
			return res.status(500).send();
		}

		// @TODO get auth stuff
	});
};

const getFileById = (app: Express, db: Pool) => {
	app.get("/api/files/:fileId", async (req, res) => {
		// try {
		timestampedLog("Received request to " + req.baseUrl);

		// @TODO get auth stuff
		const fileId = UserFileSchema.shape.id.safeParse(req.params.fileId);
		if (!fileId.success) {
			return res.status(400).send("Invalid file ID");
		}

		try {
			const id = fileId.data;
			timestampedLog(`Sent SELECT query to DB: id:[${id}]`);
			const result = await db.query("SELECT * FROM files WHERE id = $1", [id]);
			if (result.rowCount != 1) {
				console.log("Not found");
				return res.status(403).send();
			} else {
				console.log(result.rows);
				return res.status(200).send(result.rows[0]);
			}
		} catch (error) {
			console.log(`Error: ${error}`);
			return res.status(500).send();
		}
	});
};

// should maybe be called uploaFiles if we do that functionality
const uploadFile = (app: Express, db: Pool) => {
	app.post("/api/files", async (req, res) => {
		// the front end could possibly check if a filename is valid (no repeats for a user/project)

		const parsedBody = UserFileSchema.pick({name: true}).strict().safeParse(req.body);
		if (!parsedBody.success) {
			console.log("bad POST request", parsedBody.error);
			return res.status(400).send("Bad request");
		}

		try {
			const fileName = parsedBody.data.name;
			const uuid = crypto.randomUUID();
			timestampedLog(`Sent INSERT query to DB: id:[${uuid}] name: '${fileName}'`);
			const result = await db.query("INSERT INTO files (id, name, content) VALUES ($1, $2, $3) RETURNING id", [
				uuid,
				fileName,
				"",
			]);
			console.log(`result of INSERT query to DB: id:[${uuid}] name: '${fileName}'`, result.rows);
			if (result.rowCount != 1) {
				console.log("Not found");
				return res.status(403).send();
			} else {
				console.log(result.rows);
				return res.status(201).send(result.rows[0]);
			}
		} catch (error) {
			console.log("Query failed:", error);
			return res.status(500).send();
		}
	});
};

const uploadMultipleFiles = (app: Express, db: Pool) => {
	app.post("/api/upload", upload.array("file", 2000), async (req, res) => {
		console.log(req.body);
		console.log(req.files);
		if (!req.files) {
			console.log("How did we get here? Where are the files?");
			return res.status(400).send();
		}
		if (!Array.isArray(req.files) || !req.files.length) {
			console.log("How did we get here? Where is the array?");
			return res.status(400).send();
		}

		// @NOTE this is a mess
		let query_string: string = "INSERT INTO files (id, name, content) VALUES ";
		const thingies: string[] = [];
		req.files.forEach((file, i) => {
			const uuid = crypto.randomUUID();
			thingies.push(uuid);
			thingies.push(file.originalname);
			thingies.push(file.buffer.toString());
			const index: number = i * 3 + 1;
			query_string += ` ($${index}, $${index + 1}, $${index + 2}), `;
		});
		query_string = query_string.substring(0, query_string.length - 2);
		query_string += " RETURNING id;";
		console.log(thingies);
		console.log(query_string);

		try {
			const result = await db.query(query_string, thingies);
			console.log("result rows", result.rows);
			return res.status(201).send(result.rows);
		} catch (error) {
			console.log("Query failed:", error);
			return res.status(500).send();
		}
	});
};

const editFile = (app: Express, db: Pool) => {
	app.put("/api/files/:fileId", async (req, res) => {
		// @TODO figure out where we should read the fileid from, url or body
		const fileId = z.uuidv4().safeParse(req.params.fileId);
		if (!fileId.success) {
			return res.status(400).send("Invalid file ID");
		}

		const parsedBody = UserFileSchema.safeParse(req.body);
		if (!parsedBody.success) {
			console.log("bad PUT request", parsedBody.error);
			return res.status(400).send();
		}

		try {
			timestampedLog(`Sent UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`);
			const result = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3", [
				parsedBody.data.name,
				parsedBody.data.content,
				fileId.data,
			]);
			console.log(`result of UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`, result.rows);
			return res.status(200).send(result.rows[0]);
		} catch (error) {
			console.log("Query failed:", error);
			return res.status(500).send();
		}
	});
};

export default {getFiles, getFileById, uploadFile, uploadMultipleFiles, editFile};

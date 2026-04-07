import {type Express} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "#/src/validation/schemas.js";
import {requireAuth} from "#/src/middleware.js";
import z from "zod";
import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

// Type guard. Makes a type assertion for the error for TS.
function isDbError(error: unknown): error is {code: string; detail?: string; constraint?: string} {
	return typeof error === "object" && error !== null && "code" in error;
}

function getFiles(app: Express, db: Pool) {
	app.get("/api/files", requireAuth, async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);

		try {
			timestampedLog("Sent SELECT query to DB: all files for user " + req.session.userId);
			const result = await db.query(`SELECT * FROM files WHERE owner_id = $1`, [req.session.userId]);
			return res.status(200).json(result.rows);
		} catch (error) {
			console.log(`Error: ${error}`);
			return res.status(500).send();
		}
	});
}

function getFileById(app: Express, db: Pool) {
	app.get("/api/files/:fileId", requireAuth, async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);

		const fileId = UserFileSchema.shape.id.safeParse(req.params.fileId);
		if (!fileId.success) {
			return res.status(400).json({error: "Invalid file ID"});
		}

		try {
			const id = fileId.data;
			timestampedLog(`Sent SELECT query to DB: id:[${id}]`);
			const result = await db.query("SELECT * FROM files WHERE id = $1 AND owner_id = $2", [id, req.session.userId]);
			if (result.rowCount != 1) {
				console.log("Not found");
				return res.status(403).send();
			} else {
				console.log(result.rows);
				return res.status(200).json(result.rows[0]);
			}
		} catch (error) {
			console.log(`Error: ${error}`);
			return res.status(500).send();
		}
	});
}

function uploadNewFile(app: Express, db: Pool) {
	app.post("/api/files", requireAuth, async (req, res) => {
		// the front end could possibly check if a filename is valid (no repeats for a user/project)

		const parsedBody = UserFileSchema.pick({name: true}).strict().safeParse(req.body);
		if (!parsedBody.success) {
			console.error("bad POST request", parsedBody.error);
			return res.status(400).json({error: "Bad request"});
		}

		try {
			const fileName = parsedBody.data.name;
			const uuid = crypto.randomUUID();
			timestampedLog(`Sent INSERT query to DB: id:[${uuid}] name: '${fileName}'`);
			const result = await db.query(
				"INSERT INTO files (id, name, content, owner_id) VALUES ($1, $2, $3, $4) RETURNING id",
				[uuid, fileName, "", req.session.userId],
			);
			console.log(`result of INSERT query to DB: id:[${uuid}] name: '${fileName}'`, result.rows);
			if (result.rowCount != 1) {
				console.error("Not found");
				return res.status(403).send();
			} else {
				console.log(result.rows);
				return res.status(201).json(result.rows[0]);
			}
		} catch (error: unknown) {
			if (isDbError(error)) {
				if (error.constraint === "files_name_owner_id_key") {
					console.error({error: `${error.detail}`});
					return res.status(409).json({error: `${error.detail}`});
				}
			}
			console.error("Query failed:", error);
			return res.status(500).send();
		}
	});
}

function uploadMultipleFiles(app: Express, db: Pool) {
	app.post("/api/upload", requireAuth, upload.array("file", 2000), async (req, res) => {
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
		let query_string: string = "INSERT INTO files (id, name, content, owner_id) VALUES ";
		const argumentArray: (string | number)[] = [];
		req.files.forEach((file, i) => {
			const uuid = crypto.randomUUID();
			argumentArray.push(uuid);
			argumentArray.push(file.originalname);
			argumentArray.push(file.buffer.toString("utf8"));
			argumentArray.push(req.session.userId!);
			const index: number = i * 4; // i * number of fields, fields are one indexed so +1,+2,+3,+4
			query_string += ` ($${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}), `;
		});
		query_string = query_string.substring(0, query_string.length - 2);
		query_string += " RETURNING id;";
		console.log(argumentArray);
		console.log(query_string);

		try {
			const result = await db.query(query_string, argumentArray);
			console.log("result rows", result.rows);
			return res.status(201).json(result.rows);
		} catch (error: unknown) {
			if (isDbError(error)) {
				if (error.constraint === "files_name_owner_id_key") {
					console.error(`${error.detail}`);
					return res.status(409).json({error});
				}
			}
			console.log("Query failed:", error);
			return res.status(500).send();
		}
	});
}

function editFile(app: Express, db: Pool) {
	app.put("/api/files/:fileId", requireAuth, async (req, res) => {
		const fileId = z.uuidv4().safeParse(req.params.fileId);
		if (!fileId.success) {
			return res.status(400).json({error: "Invalid file ID"});
		}
		const parsedBody = UserFileSchema.safeParse(req.body);
		if (!parsedBody.success) {
			console.log("bad PUT request", parsedBody.error);
			return res.status(400).send();
		}
		if (parsedBody.data.id != fileId.data) {
			console.log("bad PUT request Error: File id mismatch");
			return res.status(400).json({error: "File id mismatch"});
		}

		try {
			timestampedLog(`Sent UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`);
			const result = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3 AND owner_id = $4", [
				parsedBody.data.name,
				parsedBody.data.content,
				fileId.data,
				req.session.userId,
			]);
			if (!result.rowCount || result.rowCount < 1) {
				return res.status(403).send();
			}
			console.log(`result of UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`, result.rows);
			return res.status(200).json(result.rows[0]);
		} catch (error) {
			console.log("Query failed:", error);
			return res.status(500).send();
		}
	});
}

function deleteFile(app: Express, db: Pool) {
	app.delete("/api/files/:fileId", requireAuth, async (req, res) => {
		const fileId = z.uuidv4().safeParse(req.params.fileId);
		if (!fileId.success) {
			return res.status(400).json({error: "Invalid file ID"});
		}

		try {
			timestampedLog(`Sent DELETE query to DB: id:[${fileId.data}]`);
			const result = await db.query("DELETE FROM files WHERE id = $1 AND owner_id = $2", [
				fileId.data,
				req.session.userId,
			]);
			console.log(`result of DELETE query to DB: id:[${fileId.data}], deleted rows count:`, result.rowCount);
			if (!result.rowCount || result.rowCount < 1) {
				return res.status(403).send();
			}
			return res.status(200).send();
		} catch (error) {
			console.log("Query failed:", error);
			return res.status(500).send();
		}
	});
}

function downloadFile(app: Express, db: Pool) {
	app.get("/api/download/:fileId", requireAuth, async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);

		const fileId = UserFileSchema.shape.id.safeParse(req.params.fileId);
		if (!fileId.success) return res.status(400).json({error: "Invalid file ID"});

		try {
			const id = fileId.data;
			timestampedLog(`Sent SELECT query to DB: id:[${id}]`);
			const result = await db.query("SELECT * FROM files WHERE id = $1 AND owner_id = $2", [id, req.session.userId]);
			if (result.rowCount != 1) {
				console.error("Invalid file ID");
				return res.status(403).send();
			} else {
				const file = result.rows[0];
				console.log(file);
				res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
				res.setHeader("Content-Type", "text/plain");
				return res.status(200).send(file.content);
			}
		} catch (error) {
			console.error(`Error: ${error}`);
			return res.status(500).send();
		}
	});
}

export default {getFiles, getFileById, uploadNewFile, uploadMultipleFiles, editFile, deleteFile, downloadFile};

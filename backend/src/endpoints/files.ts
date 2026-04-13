import {type Express} from "express";
import {Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "../../../shared/src/schemas.js";
import {requireAuth} from "#/src/middleware.js";
import z from "zod";
import multer from "multer";

// doing #shared does not work for some reason
// having is text or binary package only in shard is not enought for some reason, also need in backend
import {fileNotValid} from "../../../shared/src/fileTypeCheck.js";

// Type guard. Makes a type assertion for the error for TS.
function isDbError(error: unknown): error is {code: string; detail?: string; constraint?: string} {
	return typeof error === "object" && error !== null && "code" in error;
}
// doing #shared does not work for some reason

function getFiles(app: Express, db: Pool) {
	app.get("/api/files", requireAuth, async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);

		try {
			timestampedLog("Sent SELECT query to DB: all files for user " + req.session.userId);
			const result = await db.query(`SELECT id, name FROM files WHERE owner_id = $1`, [req.session.userId]);
			return res.status(200).json(result.rows);
		} catch (error) {
			console.log(`Error: ${error}`);
			res.status(500).send();
			return;
		}
	});
}

function getFileById(app: Express, db: Pool) {
	app.get("/api/files/:fileId", requireAuth, async (req, res) => {
		timestampedLog("Received request to " + req.baseUrl);

		const fileId = UserFileSchema.shape.id.safeParse(req.params.fileId);
		if (!fileId.success) {
			res.status(400).json({error: "Invalid file ID"});
			return;
		}

		try {
			const id = fileId.data;
			timestampedLog(`Sent SELECT query to DB: id:[${id}]`);
			const result = await db.query("SELECT * FROM files WHERE id = $1 AND owner_id = $2", [id, req.session.userId]);
			if (result.rowCount !== 1) {
				console.log("Not found");
				res.status(403).send();
				return;
			} else {
				console.log(result.rows[0]);
				res.status(200).json(result.rows[0]);
				return;
			}
		} catch (error) {
			console.log(`Error: ${error}`);
			res.status(500).send();
			return;
		}
	});
}

// const storage = multer.memoryStorage();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {fileSize: 1 * 1024 * 1024},
});

const uploadFileArray = upload.array("file", 200);
function uploadFiles(app: Express, db: Pool) {
	app.post("/api/files", requireAuth, async (req, res) => {
		uploadFileArray(req, res, async (err) => {
			if (err instanceof multer.MulterError) {
				console.log(err);
				if (err.code === "LIMIT_FILE_SIZE") {
					res.status(413).send(err.message);
				} else {
					res.status(415).send(err.message);
				}
				return;
			} else if (err) {
				console.log("huh??", err);
				res.status(500).send();
				return;
			}
			console.log(req.body);
			console.log(req.files);
			if (!req.files) {
				console.log("How did we get here? Where are the files?");
				res.status(400).send();
				return;
			}
			if (!Array.isArray(req.files) || !req.files.length) {
				console.log("How did we get here? Where is the array?");
				res.status(400).send();
				return;
			}
			// @NOTE this is a mess
			let query_string: string = "INSERT INTO files (id, name, content) VALUES ";
			const argumentArray: (string | number)[] = [];
			for (let i = 0; i < req.files.length; i++) {
				const file = req.files[i];
				const buffer_utf8 = file.buffer.toString("utf8");
				const err: string | null = fileNotValid(file.mimetype, undefined, buffer_utf8);
				if (err) {
					res.status(415).json({error: `file '${file.originalname}' is ${err}`});
					return;
				}
				argumentArray.push(buffer_utf8);
				const uuid = crypto.randomUUID();
				argumentArray.push(uuid);
				argumentArray.push(file.originalname);
				argumentArray.push(file.buffer.toString("utf8"));
				argumentArray.push(req.session.userId!);
				const index: number = i * 4; // i * number of fields, fields are one indexed so +1,+2,+3,+4
				query_string += ` ($${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}), `;
			}
			query_string = query_string.substring(0, query_string.length - 2);
			query_string += " RETURNING id;";
			// console.log(argumentArray);
			// console.log(query_string);

			try {
				const result = await db.query(query_string, argumentArray);
				console.log("result rows", result.rows);
				res.status(201).json(result.rows);
				return;
			} catch (error: unknown) {
				if (isDbError(error)) {
					if (error.constraint === "files_name_owner_id_key") {
						console.error(`${error.detail}`);
						res.status(409).json({error});
						return;
					}
					console.log("Query failed:", error);
					res.status(500).send();
					return;
				}
			}
		});
	});
}

function editFile(app: Express, db: Pool) {
	app.put("/api/files/:fileId", requireAuth, async (req, res) => {
		const fileId = z.uuidv4().safeParse(req.params.fileId);
		if (!fileId.success) {
			res.status(400).json({error: "Invalid file ID"});
			return;
		}
		const parsedBody = UserFileSchema.safeParse(req.body);
		if (!parsedBody.success) {
			console.log("bad PUT request", parsedBody.error);
			res.status(400).send();
			return;
		}
		if (parsedBody.data.id != fileId.data) {
			console.log("bad PUT request Error: File id mismatch");
			res.status(400).json({error: "File id mismatch"});
			return;
		}

		try {
			timestampedLog(`Sent UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`);
			const result = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3 AND owner_id = $4", [
				parsedBody.data.name,
				parsedBody.data.content,
				fileId.data,
				req.session.userId,
			]);
			if (result.rowCount !== 1) {
				res.status(403).send();
				return;
			}
			console.log(`result of UPDATE query to DB: id:[${fileId.data}] name: '${parsedBody.data.name}'`, result.rows);
			res.status(200).json(result.rows[0]);
			return;
		} catch (error) {
			console.log("Query failed:", error);
			res.status(500).send();
			return;
		}
	});
}

function deleteFile(app: Express, db: Pool) {
	app.delete("/api/files/:fileId", requireAuth, async (req, res) => {
		const fileId = z.uuidv4().safeParse(req.params.fileId);
		if (!fileId.success) {
			res.status(400).json({error: "Invalid file ID"});
			return;
		}

		try {
			timestampedLog(`Sent DELETE query to DB: id:[${fileId.data}]`);
			const result = await db.query("DELETE FROM files WHERE id = $1 AND owner_id = $2", [
				fileId.data,
				req.session.userId,
			]);
			console.log(`result of DELETE query to DB: id:[${fileId.data}], deleted rows count:`, result.rowCount);
			if (result.rowCount !== 1) {
				res.status(403).send();
				return;
			}
			res.status(200).send();
			return;
		} catch (error) {
			console.log("Query failed:", error);
			res.status(500).send();
			return;
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
			if (result.rowCount !== 1) {
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

export default {getFiles, getFileById, uploadFiles, editFile, deleteFile, downloadFile};

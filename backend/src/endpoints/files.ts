import type {Express, Request, Response} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "#/src/validation/schemas.js";
import {requireAuth} from "#/src/middleware.js";
import type {UserFile, ApiResponse} from "#shared/src/types.js";
import {isDbError, isInvalidByteSequence, isUniqueViolation} from "#/src/utils.js";

import multer from "multer";

// doing #shared does not work for some reason
// having is text or binary package only in shard is not enought for some reason, also need in backend
import {validateFile} from "../../../shared/src/fileValidation.js";
import assert from "node:assert";

// doing #shared does not work for some reason

function getFiles(app: Express, db: Pool) {
	app.get("/api/files", requireAuth, async (req: Request, res: Response<ApiResponse<UserFile[]>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const query = "SELECT * FROM files WHERE owner_id = $1";
		timestampedLog(`DB QUERY >>> ${query}`);
		timestampedLog(`DB VALUES >>> ${req.session.userId}`);

		try {
			const result = await db.query(query, [req.session.userId]);
			return res.status(200).json({ok: true, data: result.rows});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function getFileById(app: Express, db: Pool) {
	app.get("/api/files/:fileId", requireAuth, async (req: Request, res: Response<ApiResponse<UserFile>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const fileId = UserFileSchema.shape.id.safeParse(req.params.fileId);
		if (fileId.error) {
			return res.status(400).json({ok: false, error: "Invalid file id"});
		}

		const query = "SELECT * FROM files WHERE id = $1 AND owner_id = $2";
		const values = [fileId.data, req.session.userId];
		timestampedLog(`DB QUERY >>> ${query}`);
		timestampedLog(`DB VALUES >>> ${values}`);

		try {
			const result = await db.query(query, values);

			if (!result.rowCount) {
				return res.status(403).json({ok: false, error: "Forbidden"});
			}

			return res.status(200).json({ok: true, data: result.rows[0]});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

// const storage = multer.memoryStorage();
const upload = multer({
	storage: multer.memoryStorage(),
});

function uploadFile(app: Express, db: Pool) {
	app.post(
		"/api/files",
		requireAuth,
		upload.single("file"),
		async (req: Request, res: Response<ApiResponse<string>>) => {
			timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

			if (!req.file) {
				return res.status(400).json({ok: false, error: "No files provided"});
			}

			const f = req.file;
			const fileText = f.buffer.toString("utf8");

			const err: string | null = validateFile(f.mimetype, f.size, fileText, f.originalname);
			if (err) {
				return res.status(415).json({ok: false, error: err});
			}

			const query = "INSERT INTO files (id, name, content, owner_id) VALUES ($1, $2, $3, $4) RETURNING id";
			const values = [crypto.randomUUID(), f.originalname, fileText, req.session.userId];

			timestampedLog(`DB QUERY >>> ${query}`);
			timestampedLog(`DB VALUES >>> ${JSON.stringify(values)}`);

			try {
				const result = await db.query(query, values);
				assert(result.rowCount === 1, "Result did not contain any rows");
				const fileId = result.rows[0].id;
				assert(fileId, "Result did not contain an id field");

				return res.status(201).json({ok: true, data: fileId});
			} catch (error: unknown) {
				if (!isDbError(error)) {
					timestampedLog(`ERROR <<< ${error}`);
					return res.status(500).json({ok: false, error: "Internal server error"});
				}
				timestampedLog(`DB ERROR <<< ${error.code}: ${error.detail}`);

				// this binary file handling happens if the checks before db fail
				// @NOTE the messaging is different from normal checks
				if (isInvalidByteSequence(error)) {
					return res.status(415).json({ok: false, error: `File '${f.originalname}' has binary encoding`});
				}
				if (isUniqueViolation(error)) {
					return res.status(409).json({ok: false, error: `A file with name '${f.originalname}' already exists`});
				}

				return res.status(500).json({ok: false, error: "Internal server error"});
			}
		},
	);
}

function deleteFile(app: Express, db: Pool) {
	app.delete("/api/files/:fileId", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const fileId = UserFileSchema.shape.id.safeParse(req.params.fileId);
		if (fileId.error) {
			return res.status(400).json({ok: false, error: "Invalid file id"});
		}

		const query = "DELETE FROM files WHERE id = $1 AND owner_id = $2";
		const values = [fileId.data, req.session.userId];
		timestampedLog(`DB QUERY >>> ${query}`);
		timestampedLog(`DB VALUES >>> ${values}`);

		try {
			const result = await db.query(query, values);

			if (!result.rowCount) {
				return res.status(403).json({ok: false, error: "Forbidden"});
			}

			return res.status(200).json({ok: true, data: null});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

export default {getFiles, getFileById, uploadFile, deleteFile};

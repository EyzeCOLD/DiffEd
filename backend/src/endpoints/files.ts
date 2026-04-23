import type {Express, Request, Response} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "#/src/validation/schemas.js";
import {requireAuth} from "#/src/middleware.js";
import type {UserFile, ApiResponse} from "#shared/src/types.js";
import {isDbError, isUniqueViolation} from "#/src/utils.js";

import multer from "multer";

// doing #shared does not work for some reason
// having is text or binary package only in shard is not enought for some reason, also need in backend
import {fileNotValid} from "../../../shared/src/fileTypeCheck.js";

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

function uploadFiles(app: Express, db: Pool) {
	app.post(
		"/api/files",
		requireAuth,
		upload.array("file", 100),
		async (req: Request, res: Response<ApiResponse<string[]>>) => {
			timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

			if (!Array.isArray(req.files) || !req.files.length) {
				return res.status(400).json({ok: false, error: "No files provided"});
			}

			const fileErrors: string[] = [];
			for (const f of req.files) {
				const err: string | null = fileNotValid(f.mimetype, f.size, f.buffer.toString("utf8"), f.originalname);
				if (err) fileErrors.push(`File '${f.originalname}': ${err}`);
			}
			if (fileErrors.length > 0) {
				return res.status(415).json({ok: false, error: fileErrors.join("\0")});
			}

			// build the parameterized sql query
			const rows = req.files.map((_, i) => {
				const offset = 4 * i;
				return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
			});

			const query = `INSERT INTO files (id, name, content, owner_id) VALUES ${rows.join(", ")} RETURNING id;`;

			const values = req.files.flatMap((file) => {
				return [crypto.randomUUID(), file.originalname, file.buffer.toString("utf8"), req.session.userId];
			});

			timestampedLog(`DB QUERY >>> ${query}`);
			timestampedLog(`DB VALUES >>> ${JSON.stringify(values)}`);

			try {
				const result = await db.query(query, values);
				const ids = result.rows.map((row) => row.id);
				console.log(ids);
				return res.status(201).json({ok: true, data: ids});
			} catch (error: unknown) {
				if (!isDbError(error)) {
					timestampedLog(`ERROR <<< ${error}`);
					return res.status(500).json({ok: false, error: "Internal server error"});
				}
				timestampedLog(`DB ERROR <<< ${error.code}: ${error.detail}`);
				// this binary file handling happens if the checks before db fail
				// @NOTE the messaging is different from normal checks
				if (error.code === "22021") {
					const msg =
						req.files.length === 1
							? `File '${req.files[0].originalname}' has binary encoding`
							: "One or more files have binary encoding";
					return res.status(415).json({ok: false, error: msg});
				}
				if (isUniqueViolation(error)) {
					const msg =
						req.files.length === 1
							? `A file with name '${req.files[0].originalname}' already exists`
							: "One or more of the filenames already exist";
					return res.status(409).json({ok: false, error: msg});
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

export default {getFiles, getFileById, uploadFiles, deleteFile};

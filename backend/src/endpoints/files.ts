import type {Express, Request, Response} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "#/src/logging.js";
import {UserFileSchema} from "#/src/validation/schemas.js";
import {requireAuth} from "#/src/middleware.js";
import type {UserFile, ApiResponse} from "#shared/src/types.js";
import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

// Type guard. Makes a type assertion for the error for TS.
function isDbError(error: unknown): error is {code: string; detail?: string; constraint?: string} {
	return typeof error === "object" && error !== null && "code" in error;
}

function getFiles(app: Express, db: Pool) {
	app.get("/api/files", requireAuth, async (req: Request, res: Response<ApiResponse<UserFile[]>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		try {
			const query = "SELECT * FROM files WHERE owner_id = $1";
			timestampedLog(`DB QUERY >>> ${query}`);
			timestampedLog(`DB VALUES >>> ${req.session.userId}`);
			const result = await db.query(query, [req.session.userId]);

			return res.status(200).json({ok: true, data: result.rows});
		} catch (error) {
			timestampedLog(`ERROR <<< ${error}`);
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

		try {
			const query = "SELECT * FROM files WHERE id = $1 AND owner_id = $2";
			const values = [fileId.data, req.session.userId];

			timestampedLog(`DB QUERY >>> ${query}`);
			timestampedLog(`DB VALUES >>> ${values}`);
			const result = await db.query(query, values);

			if (!result.rowCount) {
				return res.status(403).json({ok: false, error: "Forbidden"});
			}

			return res.status(200).json({ok: true, data: result.rows[0]});
		} catch (error) {
			timestampedLog(`ERROR <<< ${error}`);
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function createNewFile(app: Express, db: Pool) {
	app.post("/api/files", requireAuth, async (req: Request, res: Response<ApiResponse<Pick<UserFile, "id">>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		const body = UserFileSchema.pick({name: true}).strict().safeParse(req.body);
		if (body.error) {
			return res.status(400).json({ok: false, error: "Bad request"});
		}

		const newFile: UserFile = {
			id: crypto.randomUUID(),
			name: body.data.name,
			content: "",
			owner_id: req.session.userId!,
		};

		try {
			const query = `INSERT INTO files (id, name, content, owner_id) VALUES ($1, $2, $3, $4) RETURNING id`;
			timestampedLog(`DB QUERY >>> ${query}`);
			timestampedLog(`DB VALUES >>> ${JSON.stringify(newFile)}`);
			const result = await db.query(query, Object.values(newFile));

			return res.status(201).json({ok: true, data: result.rows[0]});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`DB ERROR <<< ${error.code}: ${error.detail}`);
				if (error.constraint === "files_name_owner_id_key") {
					return res.status(409).json({ok: false, error: `A file with name '${newFile.name}' already exists`});
				}
			}
			timestampedLog(`ERROR <<< ${error}`);
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function uploadFiles(app: Express, db: Pool) {
	app.post(
		"/api/files/upload",
		requireAuth,
		upload.array("file", 100),
		async (req: Request, res: Response<ApiResponse<null>>) => {
			timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

			if (!Array.isArray(req.files) || !req.files.length) {
				return res.status(400).json({ok: false, error: "No files provided"});
			}

			// build the parameterized sql query
			const rows = req.files.map((_, i) => {
				const offset = 4 * i;
				return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
			});

			const query = `INSERT INTO files (id, name, content, owner_id) VALUES ${rows.join(", ")}`;
			const values = req.files.flatMap((file) => {
				return [crypto.randomUUID(), file.originalname, file.buffer.toString(), req.session.userId];
			});
			timestampedLog(`DB QUERY >>> ${query}`);
			timestampedLog(`DB VALUES >>> ${JSON.stringify(values)}`);

			try {
				await db.query(query, values);

				return res.status(201).json({ok: true, data: null});
			} catch (error: unknown) {
				if (!isDbError(error)) {
					timestampedLog(`ERROR <<< ${error}`);
					return res.status(500).json({ok: false, error: "Internal server error"});
				}

				timestampedLog(`DB ERROR <<< ${error.code}: ${error.detail}`);
				if (error.constraint === "files_name_owner_id_key") {
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
		} catch (error) {
			timestampedLog(`ERROR <<< ${error}`);
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function downloadFile(app: Express, db: Pool) {
	app.get("/api/files/:fileId/download", requireAuth, async (req: Request, res: Response<ApiResponse<UserFile>>) => {
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
			const file = result.rows[0];
			return res.status(200).json({ok: true, data: file.content});
		} catch (error) {
			timestampedLog(`ERROR <<< ${error}`);
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

export default {getFiles, getFileById, createNewFile, uploadFiles, deleteFile, downloadFile};

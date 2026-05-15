import multer from "multer";
import path from "path";
import fs from "fs";
import {type Pool} from "pg";
import type {Express, Request, Response} from "express";
import {isDbError} from "#/src/utils.js";
import type {ApiResponse} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";
import {requireAuth} from "#/src/middleware.js";
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_IMGSIZE = 1024 * 1024; // 1 MB
const DEV_AVATAR_DIR = path.resolve(process.cwd(), "src/private/avatars");
const PROD_AVATAR_DIR = path.resolve(__dirname, "../private/avatars");
const DEFAULT_AVATAR = "empty.jpg";

if (!fs.existsSync(PROD_AVATAR_DIR)) {
	fs.mkdirSync(PROD_AVATAR_DIR, {recursive: true});
}

//all the users share the same storage, since there's only 1 image per user
const storage = multer.diskStorage({
	destination: function (req: Request, file: Express.Multer.File, cb) {
		cb(null, `${PROD_AVATAR_DIR}`);
	},

	filename: function (req: Request, file: Express.Multer.File, cb) {
		const uniqueName = Date.now() + "-" + file.originalname;
		console.log(uniqueName);
		cb(null, uniqueName);
	},
});

const upload = multer({
	storage,
	fileFilter: function (req: Request, file: Express.Multer.File, cb) {
		const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(null, false);
		}
	},
	limits: {
		fileSize: MAX_IMGSIZE,
	},
});

function deleteAvatar(filename: string): void {
	const filepath = path.join(PROD_AVATAR_DIR, filename);
	if (fs.existsSync(filepath)) {
		fs.unlinkSync(filepath);
	}
}

function updateUserAvatar(app: Express, db: Pool) {
	app.patch(
		"/api/user/avatar",
		requireAuth,
		upload.single("avatar"),
		async (req: Request, res: Response<ApiResponse<null>>) => {
			timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

			if (!req.file) {
				return res.status(400).json({ok: false, error: "Invalid filetype or size"});
			}

			const filename = req.file.filename;
			console.log("Filename in PATCH: ", filename);
			const id = req.session.userId!;
			const query = "UPDATE users SET avatar_filename = $1 WHERE id = $2 RETURNING avatar_filename AS old_filename";
			const values = [filename, id];

			try {
				const result = await db.query(query, values);
				const old_filename = result.rows[0]?.old_filename;
				if (old_filename && old_filename !== "empty.jpg") {
					deleteAvatar(old_filename);
				}
				res.status(200).json({ok: true, data: null});
			} catch (error: unknown) {
				if (isDbError(error)) {
					timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
				} else {
					timestampedLog(`ERROR <<< ${error}`);
				}
				return res.status(500).json({ok: false, error: "Internal server error"});
			}
		},
	);
}

function deleteUserAvatar(app: Express, db: Pool) {
	app.delete("/api/user/avatar", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const id = req.session.userId!;
		const query = "UPDATE users SET avatar_filename = NULL WHERE id = $1 RETURNING avatar_filename AS old_filename";
		timestampedLog(`DB QUERY >>> ${query}`);
		timestampedLog(`DB VALUES >>> ${id}`);
		try {
			const result = await db.query(query, [id]);
			const old_filename = result.rows[0]?.old_filename;
			if (!old_filename || old_filename === "empty.jpg") {
				return res.status(404).json({ok: false, error: "No file uploaded"});
			}

			deleteAvatar(old_filename);

			res.status(200).json({ok: true, data: null});
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

function getUserAvatar(app: Express, db: Pool) {
	app.get("/api/user/avatar", requireAuth, async (req: Request, res: Response) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		console.log(PROD_AVATAR_DIR);

		const id = req.session.userId!;
		const query = "SELECT avatar_filename FROM users WHERE id = $1";
		timestampedLog(`DB QUERY >>> ${query}`);
		timestampedLog(`DB VALUES >>> ${id}`);

		try {
			const result = await db.query(query, [id]);
			const filename = result.rows[0]?.avatar_filename;
			let filepath: string;
			if (!filename || filename === "empty.jpg") {
				filepath = path.join(DEV_AVATAR_DIR, DEFAULT_AVATAR);
			} else if (filename === "testa_avatar.jpg") {
				filepath = path.join(DEV_AVATAR_DIR, filename);
			} else {
				filepath = path.join(PROD_AVATAR_DIR, filename);
			}
			console.log("path in GET: ", filepath);
			if (!fs.existsSync(filepath)) {
				throw new Error("invalid filepath");
			}
			res.status(200).sendFile(filepath);
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

export default {updateUserAvatar, deleteUserAvatar, getUserAvatar};

import multer from "multer";
import path from "path";
import fs from "fs";
import {type Pool} from "pg";
import type {Express, Request, Response} from "express";
import {isDbError} from "#/src/utils.js";
import type {ApiResponse, User} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";
import {requireAuth} from "#/src/middleware.js";

const MAX_IMGSIZE = 1024 * 1024; // 1 MB
const AVATAR_DIR = "/shared/avatars";
const DEFAULT_AVATAR = "/shared/avatars/empty.jpg";

//We should always have the directory, since we need the empty avatar file
//if (!fs.existsSync(AVATAR_DIR)) {
//fs.mkdirSync(AVATAR_DIR, { recursive: true });
//}

async function saveAvatar(file: Express.Multer.File, userId: number): Promise<string> {
	const extension = path.extname(file.originalname).toLowerCase();
	const filename = `${userId}-${crypto.randomUUID()}${extension}`;
	const filepath = path.join(AVATAR_DIR, filename);

	await fs.promises.rename(file.path, filepath);
	return filename;
}

async function deleteAvatar(filename: string): Promise<void> {
	const filepath = path.join(AVATAR_DIR, filename);
	if (fs.existsSync(filepath)) {
		fs.unlinkSync(filepath);
	}
}

function validateAvatar(file: Express.Multer.File): boolean {
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
	const allowedExtensions = [".jpeg", ".jpg", ".png", "webp"];
	return (
		allowedTypes.includes(file.mimetype) &&
		allowedExtensions.includes(path.extname(file.originalname).toLowerCase()) &&
		file.size <= MAX_IMGSIZE
	);
}

//the files will be temporarily uploaded here until
const upload = multer({dest: "temp/"});

function updateUserAvatar(app: Express, db: Pool) {
	app.post(
		"/api/user/avatar",
		requireAuth,
		upload.single("avatar"),
		async (req: Request, res: Response<ApiResponse<string>>) => {
			timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

			if (!req.file || !validateAvatar(req.file)) {
				if (req.file) fs.unlinkSync(req.file.path);
				return res.status(400).json({ok: false, error: "Invalid filetype or size"});
			}

			const id = req.session.userId!;

			try {
				const oldAvatar = await db.query("SELECT avatar_filename FROM users WHERE id = $1", [id]);
				if (oldAvatar.rows[0]?.avatar_filename) {
					deleteAvatar(oldAvatar.rows[0].avatar_filename);
				}

				const filename = await saveAvatar(req.file, id);
				await db.query("UPDATE users SET avatar_filename = $1 WHERE id = $2", [filename, id]);

				res.status(200).json({ok: true, data: `/avatars/${filename}`});
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
		try {
			const result = await db.query("SELECT avatar_filename FROM users WHERE id = $1", [id]);

			const filename = result.rows[0]?.avatar_filename;
			if (!filename) {
				return res.status(404).json({ok: false, error: "No file uploaded"});
			}

			const filepath = `shared/avatars/${filename}`;
			if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

			await db.query("UPDATE users SET avatar_filename = NULL WHERE id = $1", [id]);

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
	app.get("/api/user/avatar", requireAuth, async (req: Request, res: Response<ApiResponse<string>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const id = req.session.userId!;
		try {
			const result = await db.query("SELECT avatar_filename FROM users WHERE id = $1", [id]);

			const filename = result.rows[0]?.avatar_filename;
			if (!filename) {
				return res.status(200).json({ok: true, data: `${DEFAULT_AVATAR}`});
			}

			return res.status(200).json({ok: true, data: `/avatars/${filename}`});
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

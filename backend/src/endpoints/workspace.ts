import type {Express, Request, Response} from "express";
import z from "zod";
import {timestampedLog} from "#/src/logging.js";
import {requireAuth} from "#/src/middleware.js";
import {UserFileSchema} from "#/src/validation/schemas.js";
import {type CollabSocketApi} from "./collabSocket.js";
import type {ApiResponse, SessionInfo} from "#shared/src/types.js";

function createWorkspace(app: Express, api: CollabSocketApi) {
	app.post("/api/workspace", requireAuth, async (req: Request, res: Response<ApiResponse<{sessionId: string}>>) => {
		const parsed = z.object({fileId: UserFileSchema.shape.id}).strict().safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ok: false, error: "Invalid file ID"});
		}

		try {
			const sessionId = await api.createSessionFromFile(req.session.userId!, parsed.data.fileId);
			return res.status(201).json({ok: true, data: {sessionId}});
		} catch (error) {
			timestampedLog(`Failed to create workspace: ${String(error)}`);
			return res.status(403).json({ok: false, error: "File not found or not owned by you"});
		}
	});
}

function getWorkspace(app: Express, api: CollabSocketApi) {
	app.get("/api/workspace/:sessionId", requireAuth, async (req: Request, res: Response<ApiResponse<SessionInfo>>) => {
		const parsed = z.uuidv4().safeParse(req.params.sessionId);
		if (!parsed.success) {
			return res.status(400).json({ok: false, error: "Invalid session ID"});
		}

		try {
			const info = await api.getSessionInfo(parsed.data);
			if (!info) {
				return res.status(404).json({ok: false, error: "Session not found"});
			}
			return res.status(200).json({ok: true, data: info});
		} catch (error) {
			timestampedLog(`Failed to get workspace: ${String(error)}`);
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

export default {createWorkspace, getWorkspace};

import {ChangeSet, Text} from "@codemirror/state";
import {type Update, rebaseUpdates} from "@codemirror/collab";
import type {Server, Socket} from "socket.io";
import type {Pool} from "pg";
import type {Request, Response, NextFunction} from "express";
import {timestampedLog} from "../logging.js";
import sessionConfig from "../sessionConfig.js";
import type {
	CollabRequest,
	DocumentResponse,
	ErrorResponse,
	MembersChangedEvent,
	NameUpdateResponse,
	SerializedUpdate,
	SessionInfo,
	SessionMember,
} from "#shared/src/types.js";

const DATABASE_SAVE_DEBOUNCE_TIME = 1500;
// Grace period after the last socket leaves before a session is destroyed. Gives users time
// to reload, recover from a network blip, or navigate back before in-memory state is flushed.
const SESSION_DESTROY_GRACE_MS = 60_000;

type PerOwnerDocState = {
	fileId: string;
	ownerId: number;
	updates: Update[];
	doc: Text;
	pending: ((value: SerializedUpdate[]) => void)[];
	fileName: string;
	hasUnsavedChanges: boolean;
	isFlushInProgress: boolean;
	dbSaveDebounceTimer: ReturnType<typeof setTimeout> | null;
};

type SharedSession = {
	sessionId: string;
	owners: Map<number, PerOwnerDocState>;
	connectedSockets: Map<string, number>;
	usernames: Map<number, string>;
	destroyTimer: ReturnType<typeof setTimeout> | null;
};

export type CollabSocketApi = {
	createSessionFromFile: (userId: number, fileId: string) => Promise<string>;
	getSessionInfo: (sessionId: string) => Promise<SessionInfo | undefined>;
};

function serializeUpdates(updates: readonly Update[]): SerializedUpdate[] {
	return updates.map((update: Update) => ({
		clientID: update.clientID,
		changes: update.changes.toJSON(),
	}));
}

function drainPending<T>(pending: Array<(value: T) => void>, value: T): void {
	while (pending.length) {
		pending.pop()!(value);
	}
}

function sessionRoomName(sessionId: string): string {
	return `session:${sessionId}`;
}

export function collabSocket(sockets: Server, db: Pool): CollabSocketApi {
	const sessions = new Map<string, SharedSession>();

	// After this runs, socket.request.session is populated from the session store exactly as it would be for an HTTP request.
	function middlewareAdapter(expressMiddleware: (req: Request, res: Response, next: NextFunction) => void) {
		return function socketMiddleware(socket: Socket, next: (err?: Error) => void) {
			return expressMiddleware(socket.request as Request, {} as Response, next as NextFunction);
		};
	}
	sockets.use(middlewareAdapter(sessionConfig));

	// Populates socket.data.userId for authentication, or rejects the connection if there is no authenticated user.
	sockets.use((socket, next) => {
		const userId = (socket.request as Request).session?.userId;
		if (!userId) {
			next(new Error("Unauthorized"));
		} else {
			socket.data.userId = userId;
			next();
		}
	});

	async function cacheUsername(shared: SharedSession, userId: number): Promise<void> {
		if (shared.usernames.has(userId)) return;
		try {
			const result = await db.query<{username: string}>("SELECT username FROM users WHERE id = $1", [userId]);
			const username = result.rows[0]?.username ?? `user${userId}`;
			shared.usernames.set(userId, username);
		} catch (error) {
			timestampedLog(`Failed to fetch username for user ${userId}: ${String(error)}`);
			shared.usernames.set(userId, `user${userId}`);
		}
	}

	async function buildSessionInfo(shared: SharedSession): Promise<SessionInfo> {
		const members: SessionMember[] = [];
		for (const ownerId of shared.owners.keys()) {
			await cacheUsername(shared, ownerId);
			members.push({userId: ownerId, username: shared.usernames.get(ownerId)!});
		}
		return {id: shared.sessionId, members};
	}

	async function broadcastMembers(shared: SharedSession): Promise<void> {
		const info = await buildSessionInfo(shared);
		const event: MembersChangedEvent = {sessionId: shared.sessionId, members: info.members};
		sockets.to(sessionRoomName(shared.sessionId)).emit("membersChanged", event);
	}

	async function loadOwnerSlot(userId: number, fileId: string): Promise<PerOwnerDocState | undefined> {
		try {
			const result = await db.query<{name: string; content: string}>(
				"SELECT name, content FROM files WHERE id = $1 AND owner_id = $2",
				[fileId, userId],
			);
			if (result.rowCount !== 1) return undefined;
			return {
				fileId,
				ownerId: userId,
				updates: [],
				doc: Text.of((result.rows[0].content ?? "").split("\n")),
				pending: [],
				fileName: String(result.rows[0].name ?? ""),
				hasUnsavedChanges: false,
				isFlushInProgress: false,
				dbSaveDebounceTimer: null,
			};
		} catch (error) {
			timestampedLog(`Error loading collab slot for user ${userId}, file ${fileId}: ${String(error)}`);
			return undefined;
		}
	}

	async function flushOwnerSlot(slot: PerOwnerDocState): Promise<void> {
		slot.dbSaveDebounceTimer = null;
		if (slot.isFlushInProgress || !slot.hasUnsavedChanges) return;

		slot.isFlushInProgress = true;
		slot.hasUnsavedChanges = false;
		const content = slot.doc.toString();
		const fileName = slot.fileName;

		try {
			const updateResult = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3", [
				fileName,
				content,
				slot.fileId,
			]);
			if (updateResult.rowCount === 0) {
				timestampedLog(`File deleted while session was active, evicting slot: ${slot.fileId}`);
				for (const shared of sessions.values()) {
					if (shared.owners.get(slot.ownerId) === slot) {
						shared.owners.delete(slot.ownerId);
						break;
					}
				}
				drainPending(slot.pending, []);
				slot.isFlushInProgress = false;
				return;
			} else if (updateResult.rowCount! > 1) {
				timestampedLog(`Multiple files updated for collab slot ${slot.fileId}`);
			}
		} catch (error) {
			slot.hasUnsavedChanges = true;
			timestampedLog(`Error persisting collab slot ${slot.fileId}: ${String(error)}`);
		}

		slot.isFlushInProgress = false;

		// If new changes arrived while we were awaiting the DB, reschedule.
		if (slot.hasUnsavedChanges && !slot.dbSaveDebounceTimer) {
			slot.dbSaveDebounceTimer = setTimeout(() => void flushOwnerSlot(slot), DATABASE_SAVE_DEBOUNCE_TIME);
		}
	}

	function scheduleFlush(slot: PerOwnerDocState): void {
		slot.hasUnsavedChanges = true;
		if (slot.dbSaveDebounceTimer) {
			clearTimeout(slot.dbSaveDebounceTimer);
		}
		slot.dbSaveDebounceTimer = setTimeout(() => void flushOwnerSlot(slot), DATABASE_SAVE_DEBOUNCE_TIME);
	}

	async function evictSlot(slot: PerOwnerDocState): Promise<void> {
		if (slot.dbSaveDebounceTimer) {
			clearTimeout(slot.dbSaveDebounceTimer);
			slot.dbSaveDebounceTimer = null;
		}
		if (slot.hasUnsavedChanges || slot.isFlushInProgress) {
			await flushOwnerSlot(slot);
		}
		// Release any long-polling pullUpdates waiters so their clients fall through to the next cycle.
		drainPending(slot.pending, []);
	}

	async function destroySession(shared: SharedSession): Promise<void> {
		for (const slot of shared.owners.values()) {
			await evictSlot(slot);
		}
		sessions.delete(shared.sessionId);
	}

	function scheduleSessionDestroy(shared: SharedSession): void {
		if (shared.destroyTimer) return;
		shared.destroyTimer = setTimeout(() => {
			shared.destroyTimer = null;
			// Someone reconnected during the grace window — skip destruction.
			if (shared.connectedSockets.size > 0) return;
			void destroySession(shared);
		}, SESSION_DESTROY_GRACE_MS);
	}

	function cancelSessionDestroy(shared: SharedSession): void {
		if (!shared.destroyTimer) return;
		clearTimeout(shared.destroyTimer);
		shared.destroyTimer = null;
	}

	function attachSocketToSession(socket: Socket, shared: SharedSession, userId: number): void {
		if (shared.connectedSockets.has(socket.id)) return;
		cancelSessionDestroy(shared);
		shared.connectedSockets.set(socket.id, userId);
		socket.join(sessionRoomName(shared.sessionId));
	}

	function detachSocketFromSession(socketId: string, shared: SharedSession): void {
		if (!shared.connectedSockets.has(socketId)) return;
		shared.connectedSockets.delete(socketId);
		if (shared.connectedSockets.size === 0) {
			scheduleSessionDestroy(shared);
		}
	}

	async function createSessionFromFile(userId: number, fileId: string): Promise<string> {
		// Reuse a live session where this user already owns this fileId.
		for (const existing of sessions.values()) {
			const slot = existing.owners.get(userId);
			if (slot && slot.fileId === fileId && existing.connectedSockets.size > 0) {
				return existing.sessionId;
			}
		}

		const slot = await loadOwnerSlot(userId, fileId);
		if (!slot) throw new Error("File not found or not owned by user");

		const sessionId = crypto.randomUUID();
		const shared: SharedSession = {
			sessionId,
			owners: new Map([[userId, slot]]),
			connectedSockets: new Map(),
			usernames: new Map(),
			destroyTimer: null,
		};
		// Give the creator time to navigate and open a socket before we'd auto-clean.
		scheduleSessionDestroy(shared);
		await cacheUsername(shared, userId);
		sessions.set(sessionId, shared);
		return sessionId;
	}

	async function getSessionInfo(sessionId: string): Promise<SessionInfo | undefined> {
		const shared = sessions.get(sessionId);
		if (!shared) return undefined;
		return buildSessionInfo(shared);
	}

	sockets.on("connection", (socket) => {
		timestampedLog(`Client ${socket.id} connected to collab socket`);
		// userId is guaranteed to be set — the auth middleware above rejects unauthenticated connections.
		const userId: number = socket.data.userId;

		socket.on("disconnect", () => {
			for (const shared of sessions.values()) {
				if (shared.connectedSockets.has(socket.id)) {
					detachSocketFromSession(socket.id, shared);
					break;
				}
			}
		});

		socket.on("collabRequest", async (data: CollabRequest) => {
			const {id, type, sessionId, ownerId} = data;

			function sendResponse(result: unknown) {
				socket.emit("collabResponse", {id, result});
			}

			try {
				if (!sessionId || typeof sessionId !== "string") {
					sendResponse({error: "Missing sessionId"} satisfies ErrorResponse);
					return;
				}

				const shared = sessions.get(sessionId);
				if (!shared) {
					sendResponse({error: "Session not found"} satisfies ErrorResponse);
					return;
				}

				if (!socket.connected) return;

				attachSocketToSession(socket, shared, userId);

				switch (type) {
					case "pickFile": {
						if (shared.owners.has(userId)) {
							sendResponse({
								error: "You have already picked a file for this session",
							} satisfies ErrorResponse);
							break;
						}
						if (!data.fileId || typeof data.fileId !== "string") {
							sendResponse({error: "Invalid file ID"} satisfies ErrorResponse);
							break;
						}
						const slot = await loadOwnerSlot(userId, data.fileId);
						if (!slot) {
							sendResponse({error: "File not found or not owned by you"} satisfies ErrorResponse);
							break;
						}
						shared.owners.set(userId, slot);
						await cacheUsername(shared, userId);
						sendResponse(true);
						try {
							await broadcastMembers(shared);
						} catch (err) {
							timestampedLog(`Failed to broadcast members after pickFile: ${String(err)}`);
						}
						break;
					}
					case "leaveSession": {
						const slot = shared.owners.get(userId);
						if (slot) {
							await evictSlot(slot);
							shared.owners.delete(userId);
						}
						socket.leave(sessionRoomName(sessionId));
						shared.connectedSockets.delete(socket.id);
						sendResponse(true);
						if (shared.connectedSockets.size === 0) {
							await destroySession(shared);
						} else {
							await broadcastMembers(shared);
						}
						break;
					}
					case "getInitialDocument": {
						const slot = shared.owners.get(ownerId);
						if (!slot) {
							sendResponse({error: "Slot empty"} satisfies ErrorResponse);
							break;
						}
						sendResponse({
							version: slot.updates.length,
							doc: slot.doc.toString(),
						} satisfies DocumentResponse);
						break;
					}
					case "pullUpdates": {
						const slot = shared.owners.get(ownerId);
						if (!slot) {
							sendResponse({error: "Slot empty"} satisfies ErrorResponse);
							break;
						}
						if (data.version < slot.updates.length) {
							sendResponse(serializeUpdates(slot.updates.slice(data.version)));
						} else if (data.version === slot.updates.length) {
							slot.pending.push((newUpdates: SerializedUpdate[]) => {
								sendResponse(newUpdates satisfies SerializedUpdate[]);
							});
						} else {
							sendResponse([] satisfies SerializedUpdate[]);
						}
						break;
					}
					case "pushUpdates": {
						if (ownerId !== userId) {
							sendResponse({
								error: "You may only push updates to your own slot",
							} satisfies ErrorResponse);
							break;
						}
						const slot = shared.owners.get(userId);
						if (!slot) {
							sendResponse({error: "No file picked for your slot"} satisfies ErrorResponse);
							break;
						}

						let received: readonly Update[] = data.updates.map((json: SerializedUpdate) => ({
							clientID: json.clientID,
							changes: ChangeSet.fromJSON(json.changes),
						}));

						if (data.version !== slot.updates.length) {
							received = rebaseUpdates(received, slot.updates.slice(data.version));
						}

						for (const update of received) {
							slot.updates.push(update);
							slot.doc = update.changes.apply(slot.doc);
						}

						sendResponse(true);
						scheduleFlush(slot);

						if (received.length) {
							drainPending(slot.pending, serializeUpdates(received));
						}
						break;
					}
					case "pushFileName": {
						if (ownerId !== userId) {
							sendResponse({
								error: "You may only rename your own file",
							} satisfies ErrorResponse);
							break;
						}
						const slot = shared.owners.get(userId);
						if (!slot) {
							sendResponse({error: "No file picked for your slot"} satisfies ErrorResponse);
							break;
						}
						if (typeof data.name !== "string") {
							sendResponse({error: "Invalid file name"} satisfies ErrorResponse);
							break;
						}
						if (data.name !== slot.fileName) {
							slot.fileName = data.name;
							scheduleFlush(slot);
						}
						sendResponse({name: slot.fileName} satisfies NameUpdateResponse);
						break;
					}
				}
			} catch (error) {
				timestampedLog(`Error handling collab request (${type}): ${String(error)}`);
				sendResponse({error: String(error)} satisfies ErrorResponse);
			}
		});
	});

	return {createSessionFromFile, getSessionInfo};
}

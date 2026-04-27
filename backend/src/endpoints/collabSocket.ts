import {ChangeSet, Text} from "@codemirror/state";
import {type Update, rebaseUpdates} from "@codemirror/collab";
import type {Server, Socket} from "socket.io";
import type {Pool} from "pg";
import type {Request, Response, NextFunction} from "express";
import {timestampedLog} from "../logging.js";
import sessionConfig from "../sessionConfig.js";
import type {
	User,
	UserFile,
	CollabRequest,
	DocumentResponse,
	ErrorResponse,
	MembersChangedEvent,
	NameUpdateResponse,
	SerializedUpdate,
	SessionInfo,
} from "#shared/src/types.js";

const DATABASE_SAVE_DEBOUNCE_TIME = 1500;
// Gives users time to refresh, recover from a network blip, or navigate back before collab state is flushed
const SESSION_DESTROY_GRACE_MS = 3000;

type PerOwnerState = {
	ownerId: number;
	username: string;
	fileId: string;
	fileName: string;
	doc: Text;
	updates: Update[];
	pending: ((value: SerializedUpdate[]) => void)[];
	hasUnsavedChanges: boolean;
	isFlushInProgress: boolean;
	dbSaveDebounceTimer: ReturnType<typeof setTimeout> | null;
};

type SharedSession = {
	sessionId: string;
	owners: Map<number, PerOwnerState>;
	connectedSockets: Map<string, number>;
	destroyTimer: ReturnType<typeof setTimeout> | null;
};

export type CollabSocketApi = {
	createSessionFromFile: (userId: number, fileId: string) => Promise<string>;
	getSessionInfo: (sessionId: string, userId?: number) => SessionInfo | undefined;
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

	function buildSessionInfo(shared: SharedSession): SessionInfo {
		const members = [...shared.owners.values()].map((slot) => ({id: slot.ownerId, username: slot.username}));
		return {id: shared.sessionId, members};
	}

	async function broadcastMembers(shared: SharedSession): Promise<void> {
		const info = buildSessionInfo(shared);
		const event: MembersChangedEvent = {sessionId: shared.sessionId, members: info.members};
		sockets.to(sessionRoomName(shared.sessionId)).emit("membersChanged", event);
	}

	async function loadOwnerSlot(userId: number, fileId: string): Promise<PerOwnerState | undefined> {
		try {
			const result = await db.query<Pick<UserFile, "name" | "content"> & Pick<User, "username">>(
				"SELECT name, content, username FROM files JOIN users ON users.id = owner_id WHERE files.id = $1 AND owner_id = $2",
				[fileId, userId],
			);
			if (result.rowCount !== 1) return undefined;
			const row = result.rows[0];
			return {
				fileId,
				ownerId: userId,
				username: row.username,
				updates: [],
				doc: Text.of(row.content.split("\n")),
				pending: [],
				fileName: String(row.name),
				hasUnsavedChanges: false,
				isFlushInProgress: false,
				dbSaveDebounceTimer: null,
			};
		} catch (error) {
			timestampedLog(`Error loading collab slot for user ${userId}, file ${fileId}: ${String(error)}`);
			return undefined;
		}
	}

	async function flushOwnerSlot(slot: PerOwnerState): Promise<void> {
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

	function scheduleFlush(slot: PerOwnerState): void {
		slot.hasUnsavedChanges = true;
		if (slot.dbSaveDebounceTimer) {
			clearTimeout(slot.dbSaveDebounceTimer);
		}
		slot.dbSaveDebounceTimer = setTimeout(() => void flushOwnerSlot(slot), DATABASE_SAVE_DEBOUNCE_TIME);
	}

	async function evictSlot(slot: PerOwnerState): Promise<void> {
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
			destroyTimer: null,
		};
		// Give the creator time to navigate and open a socket before we'd auto-clean.
		scheduleSessionDestroy(shared);
		sessions.set(sessionId, shared);
		return sessionId;
	}

	function getSessionInfo(sessionId: string): SessionInfo | undefined {
		const shared = sessions.get(sessionId);
		if (!shared) return undefined;
		return buildSessionInfo(shared);
	}

	sockets.on("connection", (socket) => {
		timestampedLog(`Client ${socket.id} connected to collab socket`);

		socket.on("disconnect", () => {
			for (const shared of sessions.values()) {
				if (!shared.connectedSockets.has(socket.id)) continue;
				const userId = socket.data.userId as number;
				detachSocketFromSession(socket.id, shared);
				// Only evict if this user has no other sockets still connected to this session
				const stillConnected = [...shared.connectedSockets.values()].some((id) => id === userId);
				if (!stillConnected && shared.owners.has(userId)) {
					void (async () => {
						const slot = shared.owners.get(userId);
						if (slot) await evictSlot(slot);
						shared.owners.delete(userId);
						if (shared.connectedSockets.size > 0) {
							await broadcastMembers(shared);
						}
					})();
				}
				break;
			}
		});

		socket.on("collabRequest", async (data: CollabRequest) => {
			const {requestId, type, sessionId} = data;
			const userId = socket.data.userId as number;

			function sendResponse(result: unknown) {
				socket.emit("collabResponse", {requestId, result});
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
						const slot = shared.owners.get(data.ownerId);
						if (!slot) {
							sendResponse({error: "Slot empty"} satisfies ErrorResponse);
							break;
						}
						sendResponse({
							version: slot.updates.length,
							doc: slot.doc.toString(),
							fileName: slot.fileName,
						} satisfies DocumentResponse);
						break;
					}
					case "pullUpdates": {
						const slot = shared.owners.get(data.ownerId);
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
						const slot = shared.owners.get(userId);
						if (!slot) {
							sendResponse({error: "No file picked for your slot"} satisfies ErrorResponse);
							break;
						}

						if (slot.ownerId !== userId) {
							sendResponse({
								error: "You may only push updates to your own slot",
							} satisfies ErrorResponse);
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
						if (userId !== userId) {
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

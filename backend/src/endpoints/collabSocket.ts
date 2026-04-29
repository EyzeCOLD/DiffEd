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
	WorkspaceInfo,
} from "#shared/src/types.js";

const DATABASE_SAVE_DEBOUNCE_TIME = 1500;
// Gives users time to refresh, recover from a network blip, or navigate back before collab state is flushed
const WORKSPACE_DESTROY_GRACE_MS = 3000;

type LiveDocState = {
	ownerId: number;
	username: string;
	fileId: string;
	fileName: string;
	doc: Text;
	updates: Update[];
	pending: ((value: SerializedUpdate[]) => void)[];
	pendingName: ((name: string) => void)[];
	hasUnsavedChanges: boolean;
	isFlushInProgress: boolean;
	dbSaveDebounceTimer: ReturnType<typeof setTimeout> | null;
	refCount: number;
};

type Workspace = {
	workspaceId: string;
	memberFiles: Map<number, string>;
	connectedSockets: Map<string, number>;
	destroyTimer: ReturnType<typeof setTimeout> | null;
};

type CollabSocketState = {
	workspaces: Map<string, Workspace>;
	docs: Map<string, LiveDocState>;
};

export type CollabSocketApi = {
	createWorkspaceFromFile: (userId: number, fileId: string) => Promise<string>;
	getWorkspaceInfo: (workspaceId: string, userId?: number) => WorkspaceInfo | undefined;
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

function workspaceRoomName(workspaceId: string): string {
	return `workspace:${workspaceId}`;
}

export function collabSocket(sockets: Server, db: Pool): CollabSocketApi {
	const state: CollabSocketState = {
		workspaces: new Map(),
		docs: new Map(),
	};

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

	function buildWorkspaceInfo(shared: Workspace): WorkspaceInfo {
		const members = [...shared.memberFiles.values()].flatMap((fileId) => {
			const slot = state.docs.get(fileId);
			return slot ? [{id: slot.ownerId, username: slot.username}] : [];
		});
		return {id: shared.workspaceId, members};
	}

	async function broadcastMembers(shared: Workspace): Promise<void> {
		const info = buildWorkspaceInfo(shared);
		const event: MembersChangedEvent = {workspaceId: shared.workspaceId, members: info.members};
		sockets.to(workspaceRoomName(shared.workspaceId)).emit("membersChanged", event);
	}

	async function loadOwnerSlot(userId: number, fileId: string): Promise<LiveDocState | undefined> {
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
				pendingName: [],
				fileName: String(row.name),
				hasUnsavedChanges: false,
				isFlushInProgress: false,
				dbSaveDebounceTimer: null,
				refCount: 0,
			};
		} catch (error) {
			timestampedLog(`Error loading collab slot for user ${userId}, file ${fileId}: ${String(error)}`);
			return undefined;
		}
	}

	async function flushOwnerSlot(slot: LiveDocState): Promise<void> {
		// The callback that fired is no longer pending once we start processing it
		slot.dbSaveDebounceTimer = null;
		// `isFlushInProgress` prevents overlapping DB writes
		// `hasUnsavedChanges` skips stale callbacks when there is nothing left to save
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
				for (const shared of state.workspaces.values()) {
					if (shared.memberFiles.get(slot.ownerId) === slot.fileId) {
						shared.memberFiles.delete(slot.ownerId);
					}
				}
				state.docs.delete(slot.fileId);
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
			scheduleFlush(slot);
		}
	}

	function scheduleFlush(slot: LiveDocState): void {
		slot.hasUnsavedChanges = true;
		if (slot.dbSaveDebounceTimer) {
			clearTimeout(slot.dbSaveDebounceTimer);
		}
		slot.dbSaveDebounceTimer = setTimeout(() => void flushOwnerSlot(slot), DATABASE_SAVE_DEBOUNCE_TIME);
	}

	async function evictSlot(slot: LiveDocState): Promise<void> {
		if (slot.dbSaveDebounceTimer) {
			clearTimeout(slot.dbSaveDebounceTimer);
			slot.dbSaveDebounceTimer = null;
		}
		if (slot.hasUnsavedChanges || slot.isFlushInProgress) {
			await flushOwnerSlot(slot);
		}
		// Release any long-polling pullUpdates/pullFileName waiters so their clients fall through to the next cycle.
		drainPending(slot.pending, []);
		drainPending(slot.pendingName, slot.fileName);
	}

	async function releaseDocRef(fileId: string): Promise<void> {
		const slot = state.docs.get(fileId);
		if (!slot) return;
		if (--slot.refCount > 0) return;
		state.docs.delete(fileId);
		await evictSlot(slot);
	}

	async function destroyWorkspace(shared: Workspace): Promise<void> {
		state.workspaces.delete(shared.workspaceId);
		for (const fileId of shared.memberFiles.values()) {
			await releaseDocRef(fileId);
		}
	}

	function scheduleWorkspaceDestroy(shared: Workspace): void {
		if (shared.destroyTimer) return;
		shared.destroyTimer = setTimeout(() => {
			shared.destroyTimer = null;
			// Someone reconnected during the grace window — skip destruction.
			if (shared.connectedSockets.size > 0) return;
			void destroyWorkspace(shared);
		}, WORKSPACE_DESTROY_GRACE_MS);
	}

	function cancelWorkspaceDestroy(shared: Workspace): void {
		if (!shared.destroyTimer) return;
		clearTimeout(shared.destroyTimer);
		shared.destroyTimer = null;
	}

	function attachSocketToWorkspace(socket: Socket, shared: Workspace, userId: number): void {
		if (shared.connectedSockets.has(socket.id)) return;
		cancelWorkspaceDestroy(shared);
		shared.connectedSockets.set(socket.id, userId);
		socket.join(workspaceRoomName(shared.workspaceId));
	}

	function detachSocketFromWorkspace(socketId: string, shared: Workspace): void {
		if (!shared.connectedSockets.has(socketId)) return;
		shared.connectedSockets.delete(socketId);
		if (shared.connectedSockets.size === 0) {
			scheduleWorkspaceDestroy(shared);
		}
	}

	async function createWorkspaceFromFile(userId: number, fileId: string): Promise<string> {
		// Reuse a live workspace where this user already owns this fileId.
		for (const existing of state.workspaces.values()) {
			if (existing.memberFiles.get(userId) === fileId && existing.connectedSockets.size > 0) {
				return existing.workspaceId;
			}
		}

		if (!state.docs.has(fileId)) {
			const slot = await loadOwnerSlot(userId, fileId);
			if (!slot) throw new Error("File not found or not owned by user");
			if (!state.docs.has(fileId)) state.docs.set(fileId, slot);
		}
		state.docs.get(fileId)!.refCount++;

		const workspaceId = crypto.randomUUID();
		const shared: Workspace = {
			workspaceId: workspaceId,
			memberFiles: new Map([[userId, fileId]]),
			connectedSockets: new Map(),
			destroyTimer: null,
		};
		// Give the creator time to navigate and open a socket before we'd auto-clean.
		scheduleWorkspaceDestroy(shared);
		state.workspaces.set(workspaceId, shared);
		return workspaceId;
	}

	function getWorkspaceInfo(workspaceId: string): WorkspaceInfo | undefined {
		const shared = state.workspaces.get(workspaceId);
		if (!shared) return undefined;
		return buildWorkspaceInfo(shared);
	}

	sockets.on("connection", (socket) => {
		timestampedLog(`Client ${socket.id} connected to collab socket`);

		socket.on("disconnect", () => {
			for (const shared of state.workspaces.values()) {
				if (!shared.connectedSockets.has(socket.id)) continue;
				const userId = socket.data.userId as number;
				detachSocketFromWorkspace(socket.id, shared);
				// Only evict if this user has no other sockets still connected to this workspace
				const stillConnected = [...shared.connectedSockets.values()].some((id) => id === userId);
				if (!stillConnected && shared.memberFiles.has(userId)) {
					void (async () => {
						const fileId = shared.memberFiles.get(userId)!;
						shared.memberFiles.delete(userId);
						await releaseDocRef(fileId);
						if (shared.connectedSockets.size > 0) {
							await broadcastMembers(shared);
						}
					})();
				}
				break;
			}
		});

		socket.on("collabRequest", async (data: CollabRequest) => {
			const {requestId, type, workspaceId} = data;
			const userId = socket.data.userId as number;

			function sendResponse(result: unknown) {
				socket.emit("collabResponse", {requestId, result});
			}

			try {
				if (!workspaceId || typeof workspaceId !== "string") {
					sendResponse({error: "Missing workspaceId"} satisfies ErrorResponse);
					return;
				}

				const shared = state.workspaces.get(workspaceId);
				if (!shared) {
					sendResponse({error: "Workspace not found"} satisfies ErrorResponse);
					return;
				}

				if (!socket.connected) return;

				attachSocketToWorkspace(socket, shared, userId);

				switch (type) {
					case "pickFile": {
						if (shared.memberFiles.has(userId)) {
							sendResponse({
								error: "You have already picked a file for this session",
							} satisfies ErrorResponse);
							break;
						}
						if (!data.fileId || typeof data.fileId !== "string") {
							sendResponse({error: "Invalid file ID"} satisfies ErrorResponse);
							break;
						}
						if (!state.docs.has(data.fileId)) {
							const slot = await loadOwnerSlot(userId, data.fileId);
							if (!slot) {
								sendResponse({error: "File not found or not owned by you"} satisfies ErrorResponse);
								break;
							}
							if (!state.docs.has(data.fileId)) state.docs.set(data.fileId, slot);
						}
						state.docs.get(data.fileId)!.refCount++;
						shared.memberFiles.set(userId, data.fileId);
						sendResponse(true);
						try {
							await broadcastMembers(shared);
						} catch (err) {
							timestampedLog(`Failed to broadcast members after pickFile: ${String(err)}`);
						}
						break;
					}
					case "leaveWorkspace": {
						const fileId = shared.memberFiles.get(userId);
						if (fileId) {
							shared.memberFiles.delete(userId);
							await releaseDocRef(fileId);
						}
						socket.leave(workspaceRoomName(workspaceId));
						shared.connectedSockets.delete(socket.id);
						sendResponse(true);
						if (shared.connectedSockets.size === 0) {
							await destroyWorkspace(shared);
						} else {
							await broadcastMembers(shared);
						}
						break;
					}
					case "getInitialDocument": {
						const slot = state.docs.get(shared.memberFiles.get(data.ownerId) ?? "");
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
						const slot = state.docs.get(shared.memberFiles.get(data.ownerId) ?? "");
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
						const slot = state.docs.get(shared.memberFiles.get(userId) ?? "");
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
					case "pullFileName": {
						const slot = state.docs.get(shared.memberFiles.get(userId) ?? "");
						if (!slot) {
							sendResponse({error: "No file picked for your slot"} satisfies ErrorResponse);
							break;
						}
						if (slot.ownerId !== userId) {
							sendResponse({error: "You may only pull your own file name"} satisfies ErrorResponse);
							break;
						}
						slot.pendingName.push((name) => sendResponse({name} satisfies NameUpdateResponse));
						break;
					}
					case "pushFileName": {
						const slot = state.docs.get(shared.memberFiles.get(userId) ?? "");
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
							drainPending(slot.pendingName, slot.fileName);
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

	return {createWorkspaceFromFile, getWorkspaceInfo};
}

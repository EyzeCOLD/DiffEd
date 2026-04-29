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
			const doc = state.docs.get(fileId);
			return doc ? [{id: doc.ownerId, username: doc.username}] : [];
		});
		return {id: shared.workspaceId, members};
	}

	async function broadcastMembers(shared: Workspace): Promise<void> {
		const info = buildWorkspaceInfo(shared);
		const event: MembersChangedEvent = {workspaceId: shared.workspaceId, members: info.members};
		sockets.to(workspaceRoomName(shared.workspaceId)).emit("membersChanged", event);
	}

	async function loadOwnerDoc(userId: number, fileId: string): Promise<LiveDocState | undefined> {
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
			timestampedLog(`Error loading collab doc for user ${userId}, file ${fileId}: ${String(error)}`);
			return undefined;
		}
	}

	async function flushDoc(doc: LiveDocState): Promise<void> {
		// The callback that fired is no longer pending once we start processing it
		doc.dbSaveDebounceTimer = null;
		// `isFlushInProgress` prevents overlapping DB writes
		// `hasUnsavedChanges` skips stale callbacks when there is nothing left to save
		if (doc.isFlushInProgress || !doc.hasUnsavedChanges) return;

		doc.isFlushInProgress = true;
		doc.hasUnsavedChanges = false;
		const content = doc.doc.toString();
		const fileName = doc.fileName;

		try {
			const updateResult = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3", [
				fileName,
				content,
				doc.fileId,
			]);
			if (updateResult.rowCount === 0) {
				timestampedLog(`File deleted while session was active, evicting doc: ${doc.fileId}`);
				for (const shared of state.workspaces.values()) {
					if (shared.memberFiles.get(doc.ownerId) === doc.fileId) {
						shared.memberFiles.delete(doc.ownerId);
					}
				}
				state.docs.delete(doc.fileId);
				drainPending(doc.pending, []);
				drainPending(doc.pendingName, doc.fileName);
				doc.isFlushInProgress = false;
				return;
			} else if (updateResult.rowCount! > 1) {
				timestampedLog(`Multiple files updated for collab doc ${doc.fileId}`);
			}
		} catch (error) {
			doc.hasUnsavedChanges = true;
			timestampedLog(`Error persisting collab doc ${doc.fileId}: ${String(error)}`);
		}

		doc.isFlushInProgress = false;

		// If new changes arrived while we were awaiting the DB, reschedule.
		if (doc.hasUnsavedChanges && !doc.dbSaveDebounceTimer) {
			scheduleFlush(doc);
		}
	}

	function scheduleFlush(doc: LiveDocState): void {
		doc.hasUnsavedChanges = true;
		if (doc.dbSaveDebounceTimer) {
			clearTimeout(doc.dbSaveDebounceTimer);
		}
		doc.dbSaveDebounceTimer = setTimeout(() => void flushDoc(doc), DATABASE_SAVE_DEBOUNCE_TIME);
	}

	async function releaseDocRef(fileId: string): Promise<void> {
		const doc = state.docs.get(fileId);
		if (!doc || --doc.refCount > 0) return;

		state.docs.delete(fileId);

		if (doc.dbSaveDebounceTimer) {
			clearTimeout(doc.dbSaveDebounceTimer);
			doc.dbSaveDebounceTimer = null;
		}
		if (doc.hasUnsavedChanges || doc.isFlushInProgress) {
			await flushDoc(doc);
		}
		// Release any long-polling pullUpdates/pullFileName waiters so their clients fall through to the next cycle.
		drainPending(doc.pending, []);
		drainPending(doc.pendingName, doc.fileName);
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
			const doc = await loadOwnerDoc(userId, fileId);
			if (!doc) throw new Error("File not found or not owned by user");
			if (!state.docs.has(fileId)) state.docs.set(fileId, doc);
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
							const doc = await loadOwnerDoc(userId, data.fileId);
							if (!doc) {
								sendResponse({error: "File not found or not owned by you"} satisfies ErrorResponse);
								break;
							}
							if (!state.docs.has(data.fileId)) state.docs.set(data.fileId, doc);
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
						const doc = state.docs.get(shared.memberFiles.get(data.ownerId) ?? "");
						if (!doc) {
							sendResponse({error: "Doc empty"} satisfies ErrorResponse);
							break;
						}
						sendResponse({
							version: doc.updates.length,
							doc: doc.doc.toString(),
							fileName: doc.fileName,
						} satisfies DocumentResponse);
						break;
					}
					case "pullUpdates": {
						const doc = state.docs.get(shared.memberFiles.get(data.ownerId) ?? "");
						if (!doc) {
							sendResponse({error: "Doc empty"} satisfies ErrorResponse);
							break;
						}
						if (data.version < doc.updates.length) {
							sendResponse(serializeUpdates(doc.updates.slice(data.version)));
						} else if (data.version === doc.updates.length) {
							doc.pending.push((newUpdates: SerializedUpdate[]) => {
								sendResponse(newUpdates satisfies SerializedUpdate[]);
							});
						} else {
							sendResponse([] satisfies SerializedUpdate[]);
						}
						break;
					}
					case "pushUpdates": {
						const doc = state.docs.get(shared.memberFiles.get(userId) ?? "");
						if (!doc) {
							sendResponse({error: "No file picked for your doc"} satisfies ErrorResponse);
							break;
						}

						if (doc.ownerId !== userId) {
							sendResponse({
								error: "You may only push updates to your own doc",
							} satisfies ErrorResponse);
							break;
						}

						let received: readonly Update[] = data.updates.map((json: SerializedUpdate) => ({
							clientID: json.clientID,
							changes: ChangeSet.fromJSON(json.changes),
						}));

						if (data.version !== doc.updates.length) {
							received = rebaseUpdates(received, doc.updates.slice(data.version));
						}

						for (const update of received) {
							doc.updates.push(update);
							doc.doc = update.changes.apply(doc.doc);
						}

						sendResponse(true);
						scheduleFlush(doc);

						if (received.length) {
							drainPending(doc.pending, serializeUpdates(received));
						}
						break;
					}
					case "pullFileName": {
						const doc = state.docs.get(shared.memberFiles.get(userId) ?? "");
						if (!doc) {
							sendResponse({error: "No file picked for your doc"} satisfies ErrorResponse);
							break;
						}
						if (doc.ownerId !== userId) {
							sendResponse({error: "You may only pull your own file name"} satisfies ErrorResponse);
							break;
						}
						doc.pendingName.push((name) => sendResponse({name} satisfies NameUpdateResponse));
						break;
					}
					case "pushFileName": {
						const doc = state.docs.get(shared.memberFiles.get(userId) ?? "");
						if (!doc) {
							sendResponse({error: "No file picked for your doc"} satisfies ErrorResponse);
							break;
						}
						if (typeof data.name !== "string") {
							sendResponse({error: "Invalid file name"} satisfies ErrorResponse);
							break;
						}
						if (data.name !== doc.fileName) {
							doc.fileName = data.name;
							scheduleFlush(doc);
							drainPending(doc.pendingName, doc.fileName);
						}
						sendResponse({name: doc.fileName} satisfies NameUpdateResponse);
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

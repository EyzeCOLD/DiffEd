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
	NameUpdateResponse,
	SerializedUpdate,
	UserFile,
} from "#shared/src/types.js";

const DATABASE_SAVE_DEBOUNCE_TIME = 1500;

type CollabSession = {
	updates: Update[];
	doc: Text;
	pending: ((value: SerializedUpdate[]) => void)[];
	fileName: string;
	hasUnsavedChanges: boolean;
	isFlushInProgress: boolean;
	dbSaveDebounceTimer: ReturnType<typeof setTimeout> | null;
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

function collabSocket(sockets: Server, db: Pool) {
	const sessions = new Map<string, CollabSession>();

	// After this runs, socket.request.session is populated from the session store exactly as it would be for an HTTP request.
	function middlewareAdapter(expressMiddleware: (req: Request, res: Response, next: NextFunction) => void) {
		return function socketMiddleware(socket: Socket, next: (err?: Error) => void) {
			return expressMiddleware(socket.request as Request, {} as Response, next as NextFunction);
		};
	}
	sockets.use(middlewareAdapter(sessionConfig));

	// Populates socket.data.userId for authentication, or rejects the connection if there is no authenticated user. This runs after the session Express middleware,
	sockets.use((socket, next) => {
		const userId = (socket.request as Request).session?.userId;
		if (!userId) {
			next(new Error("Unauthorized"));
		} else {
			socket.data.userId = userId;
			next();
		}
	});

	async function getSession(fileId: string, userId: number): Promise<CollabSession | undefined> {
		const session = sessions.get(fileId);
		if (session) {
			return session;
		}

		let doc = Text.empty;
		let fileName = "";
		try {
			const result = await db.query<Pick<UserFile, "name" | "content">>(
				"SELECT name, content FROM files WHERE id = $1 AND owner_id = $2",
				[fileId, userId],
			);
			if (!result.rowCount) {
				sessions.delete(fileId);
				return undefined;
			} else if (result.rowCount === 1) {
				doc = Text.of((result.rows[0].content ?? "").split("\n"));
				fileName = String(result.rows[0].name ?? fileName);
			} else {
				timestampedLog(`Found ${result.rowCount} for collab document ${fileId}`);
				sessions.delete(fileId);
				return undefined;
			}
		} catch (error) {
			timestampedLog(`Error loading collab document ${fileId}: ${String(error)}`);
			sessions.delete(fileId);
			return undefined;
		}

		const created: CollabSession = {
			updates: [],
			doc,
			pending: [],
			fileName,
			hasUnsavedChanges: false,
			isFlushInProgress: false,
			dbSaveDebounceTimer: null,
		};

		sessions.set(fileId, created);
		return created;
	}

	async function flushSession(fileId: string) {
		const session = sessions.get(fileId);
		if (!session) {
			return;
		}

		// The callback that fired is no longer pending once we start processing it
		session.dbSaveDebounceTimer = null;
		// `isFlushInProgress` prevents overlapping DB writes
		// `hasUnsavedChanges` skips stale callbacks when there is nothing left to save
		if (session.isFlushInProgress || !session.hasUnsavedChanges) {
			return;
		}

		session.isFlushInProgress = true;

		session.hasUnsavedChanges = false;
		const content = session.doc.toString();
		const fileName = session.fileName;

		try {
			const updateResult = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3", [
				fileName,
				content,
				fileId,
			]);
			if (updateResult.rowCount === 0) {
				timestampedLog(`No file found to update for collab document ${fileId}`);
				sessions.delete(fileId);
				session.isFlushInProgress = false;
				return;
			} else if (updateResult.rowCount! > 1) {
				timestampedLog(`Multiple files updated for collab document ${fileId}`);
				sessions.delete(fileId);
				session.isFlushInProgress = false;
				return;
			}
		} catch (error) {
			session.hasUnsavedChanges = true;
			timestampedLog(`Error persisting collab document ${fileId}: ${String(error)}`);
		}

		session.isFlushInProgress = false;

		// If new changes arrived while we were awaiting the DB, or a stale timer already fired, queue a follow-up flush
		if (session.hasUnsavedChanges && !session.dbSaveDebounceTimer) {
			session.dbSaveDebounceTimer = setTimeout(() => {
				void flushSession(fileId);
			}, DATABASE_SAVE_DEBOUNCE_TIME);
		}
	}

	function scheduleFlush(fileId: string, session: CollabSession) {
		session.hasUnsavedChanges = true;
		if (session.dbSaveDebounceTimer) {
			clearTimeout(session.dbSaveDebounceTimer);
		}
		session.dbSaveDebounceTimer = setTimeout(() => {
			void flushSession(fileId);
		}, DATABASE_SAVE_DEBOUNCE_TIME);
	}

	sockets.on("connection", (socket) => {
		timestampedLog(`Client ${socket.id} connected to collab socket`);
		// userId is guaranteed to be set — the auth middleware above rejects unauthenticated connections
		const userId: number = socket.data.userId;

		socket.on("collabRequest", async (data: CollabRequest) => {
			const {id, type, fileId} = data;

			const sendResponse = (result: unknown) => {
				socket.emit("collabResponse", {id, result});
			};

			try {
				if (!fileId || fileId.length === 0) {
					sendResponse({error: "Empty file ID"} satisfies ErrorResponse);
					return;
				}

				const session = await getSession(fileId, userId);
				if (!session) {
					sendResponse({error: "File does not exist"} satisfies ErrorResponse);
					return;
				}

				switch (type) {
					case "pullUpdates": {
						console.log(`Client ${socket.id} requested updates for file ${fileId} since version ${data.version}`);
						if (session.doc.length < 0) {
							sendResponse({error: "Document is in invalid state"} satisfies ErrorResponse);
							return;
						}
						if (data.version < session.updates.length) {
							sendResponse(serializeUpdates(session.updates.slice(data.version)));
						} else if (data.version === session.updates.length) {
							session.pending.push((newUpdates: SerializedUpdate[]) => {
								sendResponse(newUpdates);
							});
						} else {
							sendResponse([]);
						}
						break;
					}
					case "pushUpdates": {
						let received: readonly Update[] = data.updates.map((json: SerializedUpdate) => ({
							clientID: json.clientID,
							changes: ChangeSet.fromJSON(json.changes),
						}));

						if (data.version !== session.updates.length) {
							received = rebaseUpdates(received, session.updates.slice(data.version));
						}

						for (const update of received) {
							session.updates.push(update);
							session.doc = update.changes.apply(session.doc);
						}

						sendResponse(true);
						scheduleFlush(fileId, session);

						if (received.length) {
							drainPending(session.pending, serializeUpdates(received));
						}
						break;
					}
					case "getInitialDocument": {
						sendResponse({
							version: session.updates.length,
							doc: session.doc.toString(),
						} satisfies DocumentResponse);
						break;
					}
					case "pushFileName": {
						const nextNameRaw = data.name;
						if (typeof nextNameRaw !== "string") {
							sendResponse({error: "Invalid file name"});
							return;
						}

						if (nextNameRaw !== session.fileName) {
							session.fileName = nextNameRaw;
							scheduleFlush(fileId, session);
						}

						sendResponse({
							name: session.fileName,
						} satisfies NameUpdateResponse);
						break;
					}
				}
			} catch (error) {
				timestampedLog(`Error handling collab request (${type}): ${error}`);
				sendResponse({error: String(error)});
			}
		});
	});
}

export {collabSocket};

import {ChangeSet, Text} from "@codemirror/state";
import {Update, rebaseUpdates} from "@codemirror/collab";
import {Server} from "socket.io";
import type {Pool} from "pg";
import {timestampedLog} from "../logging.js";
import {
	CollabRequest,
	DocumentResponse,
	ErrorResponse,
	NameUpdateResponse,
	SerializedUpdate,
	UserFile,
} from "#shared/src/types.js";

const DATABASE_SAVE_DEBOUNCE_TIME = 1500;

interface NameUpdate {
	name: string;
	version: number;
}

interface CollabSession {
	updates: Update[];
	doc: Text;
	pending: ((value: SerializedUpdate[]) => void)[];
	fileName: string;
	nameVersion: number;
	pendingName: ((value: NameUpdate) => void)[];
	hasUnsavedChanges: boolean;
	dbSaveDebounceTimer: ReturnType<typeof setTimeout> | null;
}

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

function collabSocket(io: Server, db: Pool) {
	const sessions = new Map<number, CollabSession>();

	const getSession = async (fileId: number): Promise<CollabSession> => {
		const existing = sessions.get(fileId);
		if (existing) {
			return existing;
		}

		let doc = Text.of([""]);
		let fileName = "new.md";
		try {
			const result = await db.query<Pick<UserFile, "name" | "content">>(
				"SELECT name, content FROM files WHERE id = $1",
				[fileId],
			);
			if (result.rowCount === 1) {
				const content = String(result.rows[0].content ?? "");
				fileName = String(result.rows[0].name ?? fileName);
				doc = Text.of(content.split("\n"));
			}
		} catch (error) {
			timestampedLog(`Error loading collab document ${fileId}: ${String(error)}`);
		}

		const created: CollabSession = {
			updates: [],
			doc,
			pending: [],
			fileName,
			nameVersion: 0,
			pendingName: [],
			hasUnsavedChanges: false,
			dbSaveDebounceTimer: null,
		};

		sessions.set(fileId, created);
		return created;
	};

	const flushSession = async (fileId: number) => {
		const session = sessions.get(fileId);
		if (!session) {
			return;
		}

		session.dbSaveDebounceTimer = null;
		if (!session.hasUnsavedChanges) {
			return;
		}

		session.hasUnsavedChanges = false;
		const content = session.doc.toString();

		try {
			const updateResult = await db.query("UPDATE files SET name = $1, content = $2 WHERE id = $3", [
				session.fileName,
				content,
				fileId,
			]);
			if (updateResult.rowCount === 0) {
				timestampedLog(`No file found to update for collab document ${fileId}`);
				throw new Error("File not found for collab document save");
			}
		} catch (error) {
			session.hasUnsavedChanges = true;
			timestampedLog(`Error persisting collab document ${fileId}: ${String(error)}`);
		}

		if (session.hasUnsavedChanges && !session.dbSaveDebounceTimer) {
			session.dbSaveDebounceTimer = setTimeout(() => void flushSession(fileId), DATABASE_SAVE_DEBOUNCE_TIME);
		}
	};

	const schedulePersist = (fileId: number, session: CollabSession) => {
		session.hasUnsavedChanges = true;
		if (session.dbSaveDebounceTimer) {
			clearTimeout(session.dbSaveDebounceTimer);
		}
		session.dbSaveDebounceTimer = setTimeout(() => {
			void flushSession(fileId);
		}, DATABASE_SAVE_DEBOUNCE_TIME);
	};

	io.on("connection", (socket) => {
		timestampedLog(`Client ${socket.id} connected to collab socket`);

		socket.on("collabRequest", async (data: CollabRequest) => {
			const {id, type, fileId} = data;

			const sendResponse = (result: unknown) => {
				socket.emit("collabResponse", {id, result});
			};

			try {
				if (!Number.isInteger(fileId) || fileId < 0) {
					sendResponse({error: "Invalid fileId"} satisfies ErrorResponse);
					return;
				}

				const session = await getSession(fileId);

				switch (type) {
					case "pullUpdates": {
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
						schedulePersist(fileId, session);

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
					case "getFileName": {
						sendResponse({
							name: session.fileName,
							version: session.nameVersion,
						} satisfies NameUpdateResponse);
						break;
					}
					case "pullFileName": {
						if (data.version < session.nameVersion) {
							sendResponse({
								name: session.fileName,
								version: session.nameVersion,
							} satisfies NameUpdateResponse);
						} else if (data.version === session.nameVersion) {
							session.pendingName.push((nameUpdate: NameUpdate) => {
								sendResponse(nameUpdate satisfies NameUpdateResponse);
							});
						} else {
							sendResponse({
								name: session.fileName,
								version: session.nameVersion,
							} satisfies NameUpdateResponse);
						}
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
							session.nameVersion += 1;
							schedulePersist(fileId, session);

							const nameUpdate: NameUpdate = {
								name: session.fileName,
								version: session.nameVersion,
							} satisfies NameUpdateResponse;

							drainPending(session.pendingName, nameUpdate);
						}

						sendResponse({
							name: session.fileName,
							version: session.nameVersion,
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

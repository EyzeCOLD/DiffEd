import {ChangeSet, Text} from "@codemirror/state";
import {Update, rebaseUpdates} from "@codemirror/collab";
import {Server} from "socket.io";
import {timestampedLog} from "../logging.js";

function collabSocket(io: Server) {
	// The updates received so far (updates.length gives the current version)
	const updates: Update[] = [];
	// The current document
	let doc = Text.of(["Start document"]);

	const pending: ((value: Update[]) => void)[] = [];

	io.on("connection", (socket) => {
		timestampedLog("Client connected to collab socket");

		socket.on("pullUpdates", (data, callback) => {
			if (data.version < updates.length) {
				callback(updates.slice(data.version));
			} else {
				pending.push(callback);
			}
		});

		socket.on("pushUpdates", (data, callback) => {
			// Convert the JSON representation to an actual ChangeSet instance
			let received = data.updates.map((json: Update) => ({
				clientID: json.clientID,
				changes: ChangeSet.fromJSON(json.changes),
			}));
			if (data.version != updates.length) received = rebaseUpdates(received, updates.slice(data.version));
			for (const update of received) {
				updates.push(update);
				doc = update.changes.apply(doc);
			}
			callback(true);
			if (received.length) {
				// Notify pending requests
				const json = received.map((update: Update) => ({
					clientID: update.clientID,
					changes: update.changes.toJSON(),
				}));
				while (pending.length) pending.pop()!(json);
			}
		});

		socket.on("getDocument", (data, callback) => {
			callback({version: updates.length, doc: doc.toString()});
		});

		socket.on("message", (data) => {
			const normalizedMessage = {
				text: typeof data?.text === "string" ? data.text : String(data),
				sentAt: typeof data?.sentAt === "string" ? data.sentAt : new Date().toISOString(),
				senderId: socket.id,
			};

			io.emit("message", normalizedMessage);
		});
	});
}

export {collabSocket};

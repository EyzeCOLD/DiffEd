import {ChangeSet, Text} from "@codemirror/state";
import type {Update} from "@codemirror/collab";
import {io, type Socket} from "socket.io-client";
import type {
	CollabRequest,
	CollabRequestPayload,
	DocumentResponse,
	NameUpdateResponse,
	SerializedUpdate,
} from "#shared/src/types";
import type {ErrorResponse} from "#shared/src/types";

const CONNECT_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 8000;
const COLLAB_URL = import.meta.env.COLLAB_SERVER_URL || window.location.origin;

type CollabResponse =
	| {
			id: number;
			result: unknown;
	  }
	| ErrorResponse;

type PendingRequest = {
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
	timeoutId: ReturnType<typeof setTimeout>;
};

/** Wrapper for socket.io connection to communicate with our collab server */
export class CollabConnection {
	private socket: Socket;
	private fileId: string;
	private requestId = 0;
	private pendingRequests: Map<number, PendingRequest>;

	constructor(fileId: string) {
		this.fileId = fileId;

		this.socket = io(COLLAB_URL, {
			path: "/socket.io",
			autoConnect: true,
			transports: ["websocket", "polling"],
		});
		this.pendingRequests = new Map();

		this.socket.on("collabResponse", (data: CollabResponse) => {
			if ("error" in data) {
				console.error("Received error response from collab server:", data.error);
				return;
			}

			const pending = this.pendingRequests.get(data.id);
			if (pending) {
				this.pendingRequests.delete(data.id);
				clearTimeout(pending.timeoutId);

				pending.resolve(data.result);
			}
		});

		this.socket.on("connect_error", (error) => {
			this.rejectAllPending(error);
		});
	}

	private rejectAllPending(reason: unknown): void {
		for (const [, pending] of this.pendingRequests) {
			clearTimeout(pending.timeoutId);
			pending.reject(reason);
		}
		this.pendingRequests.clear();
	}

	private async ensureConnected(): Promise<void> {
		if (this.socket.connected) {
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				cleanup();
				reject(new Error("Timed out connecting to collaboration server"));
			}, CONNECT_TIMEOUT_MS);

			function onConnect() {
				cleanup();
				resolve();
			}

			function onError(error: Error) {
				cleanup();
				reject(error);
			}

			// Declared in arrow syntax to maintain class' `this` context
			const cleanup = () => {
				clearTimeout(timeoutId);
				this.socket.off("connect", onConnect);
				this.socket.off("connect_error", onError);
			};

			this.socket.on("connect", onConnect);
			this.socket.on("connect_error", onError);
			this.socket.connect();
		});
	}

	async request(data: CollabRequestPayload): Promise<unknown> {
		await this.ensureConnected();

		const id = this.requestId++;
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Timed out waiting for collab response: ${data.type}`));
			}, REQUEST_TIMEOUT_MS);

			this.pendingRequests.set(id, {resolve, reject, timeoutId});
			const request: CollabRequest = {id, fileId: this.fileId, ...data};
			this.socket.emit("collabRequest", request);
		});
	}

	isConnected(): boolean {
		return this.socket.connected;
	}

	disconnect(): void {
		this.rejectAllPending(new Error("Collab connection closed"));
		this.socket.disconnect();
	}
}

export async function getInitialDocument(connection: CollabConnection): Promise<{version: number; doc: Text}> {
	const result = (await connection.request({type: "getInitialDocument"})) as DocumentResponse;
	if ("error" in result) {
		throw new Error(`Failed to get initial document: ${result.error}`);
	}
	return {
		version: result.version,
		doc: Text.of(result.doc.split("\n")),
	};
}

export async function pullUpdates(connection: CollabConnection, version: number): Promise<readonly Update[]> {
	const result = (await connection.request({type: "pullUpdates", version})) as SerializedUpdate[] | ErrorResponse;
	if ("error" in result) {
		throw new Error(`Failed to pull updates: ${result.error}`);
	}
	return result.map((record: SerializedUpdate) => {
		return {
			changes: ChangeSet.fromJSON(record.changes),
			clientID: record.clientID,
		};
	});
}

export async function pushUpdates(
	connection: CollabConnection,
	version: number,
	fullUpdates: readonly Update[],
): Promise<boolean> {
	const updates = fullUpdates.map((u) => ({
		clientID: u.clientID,
		changes: u.changes.toJSON() as string,
	}));
	const result = await connection.request({type: "pushUpdates", version, updates});
	return result === true;
}

export async function pushFileName(connection: CollabConnection, name: string): Promise<NameUpdateResponse> {
	return (await connection.request({type: "pushFileName", name})) as NameUpdateResponse;
}

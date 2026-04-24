import {ChangeSet, Text} from "@codemirror/state";
import {CollabConnection, getInitialDocument, pullUpdates} from "./collabClient";

export type peerDoc = {
	doc: Text;
	version: number;
};

export type peerDocEvent = {
	doc: peerDoc;
	changes: ChangeSet | null;
};

type PeerState = {
	doc: peerDoc | undefined;
	aborted: boolean;
};

const PULL_ERROR_BACKOFF_MS = 1000;
const INITIAL_MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 250;

export class CollabPeersPool {
	private connection: CollabConnection;
	private peers = new Map<number, PeerState>();
	private listeners = new Set<(ownerId: number, event: peerDocEvent) => void>();

	constructor(connection: CollabConnection) {
		this.connection = connection;
	}

	setSyncedPeers(peerIds: Set<number>): void {
		for (const id of [...this.peers.keys()]) {
			if (!peerIds.has(id)) this.removePeer(id);
		}
		for (const id of peerIds) {
			if (!this.peers.has(id)) this.addPeer(id);
		}
	}

	private addPeer(id: number): void {
		if (this.peers.has(id)) return;
		const state: PeerState = {doc: undefined, aborted: false};
		this.peers.set(id, state);
		void this.runPeer(id, state);
	}

	private removePeer(id: number): void {
		const state = this.peers.get(id);
		if (!state) return;
		state.aborted = true;
		this.peers.delete(id);
	}

	getPeerDoc(ownerId: number): peerDoc | null {
		return this.peers.get(ownerId)?.doc ?? null;
	}

	onShadowUpdate(fn: (ownerId: number, event: peerDocEvent) => void): () => void {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}

	dispose(): void {
		for (const state of this.peers.values()) {
			state.aborted = true;
		}
		this.peers.clear();
		this.listeners.clear();
	}

	private notify(ownerId: number, event: peerDocEvent): void {
		for (const listener of this.listeners) {
			listener(ownerId, event);
		}
	}

	private async runPeer(ownerId: number, state: PeerState): Promise<void> {
		// Initial fetch with retry, mirroring CodeEditor's backoff.
		for (let attempt = 1; attempt <= INITIAL_MAX_ATTEMPTS; attempt += 1) {
			if (state.aborted) return;
			try {
				const {doc, version} = await getInitialDocument(this.connection, ownerId);
				state.doc = {doc, version};
				this.notify(ownerId, {doc: state.doc, changes: null});
				break;
			} catch (error) {
				if (state.aborted) return;
				if (attempt === INITIAL_MAX_ATTEMPTS) {
					console.error(`Failed to load initial doc for owner ${ownerId}:`, error);
					return;
				}
				await new Promise((resolve) => setTimeout(resolve, INITIAL_RETRY_DELAY_MS));
			}
		}

		while (!state.aborted && state.doc) {
			try {
				const updates = await pullUpdates(this.connection, ownerId, state.doc.version);
				if (state.aborted || !state.doc) return;
				if (updates.length === 0) continue;

				let doc = state.doc.doc;
				let composed: ChangeSet | null = null;
				for (const update of updates) {
					composed = composed ? composed.compose(update.changes) : update.changes;
					doc = update.changes.apply(doc);
				}
				state.doc = {
					doc,
					version: state.doc.version + updates.length,
				};
				this.notify(ownerId, {doc: state.doc, changes: composed});
			} catch (error) {
				if (state.aborted) return;
				console.error(`Peer ${ownerId} pull failed:`, error);
				await new Promise((resolve) => setTimeout(resolve, PULL_ERROR_BACKOFF_MS));
			}
		}
	}
}

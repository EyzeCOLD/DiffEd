import {ChangeSet, Text} from "@codemirror/state";
import type {SessionMember} from "#shared/src/types";
import {CollabConnection, getInitialDocument, pullUpdates} from "./collabClient";
import {delay} from "../utils";

export type PeerDoc = {
	doc: Text;
	version: number;
};

export type PeerDocEvent = {
	doc: PeerDoc;
	changes: ChangeSet | null;
};

type PeerState = {
	member: SessionMember;
	doc: PeerDoc | undefined;
	aborted: boolean;
};

const INITIAL_MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 250;
const ERROR_RETRY_DELAY_MS = 1000;

export class CollabPeersPool {
	private connection: CollabConnection;
	private myOwnerId: number;
	private peerSlots = new Map<number, PeerState>();
	private docListeners = new Set<(ownerId: number, event: PeerDocEvent) => void>();
	private peersListeners = new Set<(peers: SessionMember[]) => void>();
	private unsubscribeMembers: () => void;

	constructor(connection: CollabConnection, myOwnerId: number, initialMembers: SessionMember[]) {
		this.connection = connection;
		this.myOwnerId = myOwnerId;
		this.syncPeerSlots(initialMembers.filter((m) => m.userId !== myOwnerId));
		this.unsubscribeMembers = connection.subscribeMembers((event) => {
			const peers = event.members.filter((m) => m.userId !== this.myOwnerId);
			this.syncPeerSlots(peers);
			for (const fn of this.peersListeners) fn(peers);
		});
	}

	getPeers(): SessionMember[] {
		return [...this.peerSlots.values()].map((s) => s.member);
	}

	onPeersChange(fn: (peers: SessionMember[]) => void): () => void {
		this.peersListeners.add(fn);
		return () => this.peersListeners.delete(fn);
	}

	private syncPeerSlots(peers: SessionMember[]): void {
		const peerIds = new Set(peers.map((p) => p.userId));
		for (const id of [...this.peerSlots.keys()]) {
			if (!peerIds.has(id)) this.removePeer(id);
		}
		for (const member of peers) {
			if (!this.peerSlots.has(member.userId)) this.addPeer(member);
		}
	}

	private addPeer(member: SessionMember): void {
		if (this.peerSlots.has(member.userId)) return;
		const state: PeerState = {member, doc: undefined, aborted: false};
		this.peerSlots.set(member.userId, state);
		void this.runPeer(member.userId, state);
	}

	private removePeer(id: number): void {
		const state = this.peerSlots.get(id);
		if (!state) return;
		state.aborted = true;
		this.peerSlots.delete(id);
	}

	getPeerDoc(ownerId: number): PeerDoc | null {
		return this.peerSlots.get(ownerId)?.doc ?? null;
	}

	isReady(ownerId: number): boolean {
		return this.peerSlots.get(ownerId)?.doc !== undefined;
	}

	onShadowUpdate(fn: (ownerId: number, event: PeerDocEvent) => void): () => void {
		this.docListeners.add(fn);
		return () => {
			this.docListeners.delete(fn);
		};
	}

	dispose(): void {
		this.unsubscribeMembers();
		for (const state of this.peerSlots.values()) {
			state.aborted = true;
		}
		this.peerSlots.clear();
		this.docListeners.clear();
		this.peersListeners.clear();
	}

	private notify(ownerId: number, event: PeerDocEvent): void {
		for (const listener of this.docListeners) {
			listener(ownerId, event);
		}
	}

	private async fetchInitialDoc(ownerId: number, state: PeerState): Promise<boolean> {
		let attempt = 0;
		// Will retry infinitely to account for collab users in file picker
		while (!state.aborted) {
			try {
				const {doc, version} = await getInitialDocument(this.connection, ownerId);
				state.doc = {doc, version};
				this.notify(ownerId, {doc: state.doc, changes: null});
				return true;
			} catch (error) {
				if (state.aborted) return false;
				attempt++;
				console.error(`Failed to load initial doc for owner ${ownerId}:`, error);
				await delay(attempt < INITIAL_MAX_ATTEMPTS ? INITIAL_RETRY_DELAY_MS : ERROR_RETRY_DELAY_MS);
			}
		}
		return false;
	}

	private async runPeer(ownerId: number, state: PeerState): Promise<void> {
		if (!(await this.fetchInitialDoc(ownerId, state))) return;

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
				await delay(ERROR_RETRY_DELAY_MS);
			}
		}
	}
}

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
	doc?: PeerDoc;
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
	private membersListeners = new Set<(members: SessionMember[]) => void>();
	private unsubscribeMembers: () => void;

	constructor(connection: CollabConnection, myOwnerId: number, initialMembers: SessionMember[]) {
		this.connection = connection;
		this.myOwnerId = myOwnerId;
		this.syncPeerSlots(initialMembers.filter((m) => m.id !== myOwnerId));
		this.unsubscribeMembers = connection.subscribeMembers((event) => {
			const members = event.members.filter((m) => m.id !== this.myOwnerId);
			this.syncPeerSlots(members);
			for (const fn of this.membersListeners) fn(members);
		});
	}

	getMembers(): SessionMember[] {
		return [...this.peerSlots.values()].map((s) => s.member);
	}

	onMembersChange(fn: (members: SessionMember[]) => void): () => void {
		this.membersListeners.add(fn);
		return () => this.membersListeners.delete(fn);
	}

	private syncPeerSlots(peers: SessionMember[]): void {
		const peerIds = new Set(peers.map((p) => p.id));
		for (const id of [...this.peerSlots.keys()]) {
			if (!peerIds.has(id)) this.removePeer(id);
		}
		for (const member of peers) {
			if (!this.peerSlots.has(member.id)) this.addPeer(member);
		}
	}

	private addPeer(member: SessionMember): void {
		if (this.peerSlots.has(member.id)) return;
		const state: PeerState = {member, doc: undefined, aborted: false};
		this.peerSlots.set(member.id, state);
		this.runPeer(member.id, state);
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

	onDocUpdate(fn: (ownerId: number, event: PeerDocEvent) => void): () => void {
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
		this.membersListeners.clear();
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

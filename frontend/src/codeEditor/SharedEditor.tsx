import {useEffect, useMemo, useRef, useState} from "react";
import type {JSX} from "react";
import type {SessionMember} from "#shared/src/types";
import {CollabConnection} from "./collabClient";
import {CollabPeersPool, type peerDocEvent} from "./peerShadows";
import MyMergeEditor, {type MyMergeEditorHandle} from "./MyMergeEditor";
import PeerBar from "./PeerBar";

type SharedEditorProps = {
	connection: CollabConnection;
	myOwnerId: number;
	initialMembers: SessionMember[];
};

export default function SharedEditor({connection, myOwnerId, initialMembers}: SharedEditorProps): JSX.Element {
	const [members, setMembers] = useState<SessionMember[]>(initialMembers);
	const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
	const [readyPeerIds, setReadyPeerIds] = useState<ReadonlySet<number>>(new Set());
	const editorRef = useRef<MyMergeEditorHandle>(null);

	const pool = useMemo(() => new CollabPeersPool(connection), [connection]);

	const peers = members.filter((m) => m.userId !== myOwnerId);

	useEffect(() => {
		return function cleanup() {
			pool.dispose();
		};
	}, [pool]);

	useEffect(() => {
		const unsubscribe = connection.subscribeMembers((event) => {
			setMembers(event.members);
		});
		return unsubscribe;
	}, [connection]);

	useEffect(() => {
		pool.setSyncedPeers(new Set(peers.map((p) => p.userId)));
	}, [peers, pool]);

	const basePeerId = useMemo(() => {
		if (selectedPeerId !== null && peers.some((p) => p.userId === selectedPeerId)) {
			return selectedPeerId;
		}
		const firstReady = peers.find((p) => readyPeerIds.has(p.userId));
		return firstReady?.userId ?? null;
	}, [selectedPeerId, peers, readyPeerIds]);

	useEffect(() => {
		const unsubscribe = pool.onShadowUpdate((ownerId: number, event: peerDocEvent) => {
			if (ownerId === basePeerId && event.changes !== null) {
				editorRef.current?.updateOriginal(event.doc.doc, event.changes);
			}
			if (event.changes === null) {
				setReadyPeerIds((prev) => new Set([...prev, ownerId]));
			}
		});
		return unsubscribe;
	}, [pool, basePeerId]);

	const peerDoc = basePeerId === null ? null : (pool.getPeerDoc(basePeerId)?.doc ?? null);

	function handleSelectPeer(ownerId: number) {
		setSelectedPeerId(ownerId);
	}

	return (
		<div className="flex flex-col h-full">
			<PeerBar peers={peers} selectedOwnerId={basePeerId} onSelect={handleSelectPeer} pool={pool} />
			<div className="flex-1 min-h-0">
				<MyMergeEditor
					key={basePeerId ?? "solo"}
					ref={editorRef}
					connection={connection}
					myOwnerId={myOwnerId}
					peerInitialDoc={peerDoc}
				/>
			</div>
		</div>
	);
}

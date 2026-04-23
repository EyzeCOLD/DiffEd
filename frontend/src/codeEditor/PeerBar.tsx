import type {JSX} from "react";
import type {SessionMember} from "#shared/src/types";
import {CollabPeersPool} from "./peerShadows";

type PeerBarProps = {
	peers: SessionMember[];
	selectedOwnerId: number | null;
	onSelect: (ownerId: number) => void;
	pool: CollabPeersPool;
};

export default function PeerBar({peers, selectedOwnerId, onSelect, pool}: PeerBarProps): JSX.Element {
	if (peers.length === 0) {
		return (
			<div className="flex flex-row items-center gap-2 p-2 bg-surface">
				<span>Solo mode — share this URL to collaborate.</span>
			</div>
		);
	}

	return (
		<div className="flex flex-row items-center gap-2 p-2 bg-surface" role="tablist" aria-label="Peers">
			{peers.map((peer) => {
				const ready = pool.getPeerDoc(peer.userId) !== undefined;
				const selected = peer.userId === selectedOwnerId;
				return (
					<button
						key={peer.userId}
						type="button"
						role="tab"
						aria-selected={selected}
						disabled={!ready}
						onClick={() => onSelect(peer.userId)}
						className={`px-2 py-1 border ${selected ? "border-accent" : "border-transparent"}${ready ? " cursor-pointer" : " opacity-50 cursor-wait"}`}
					>
						{peer.username}
					</button>
				);
			})}
		</div>
	);
}

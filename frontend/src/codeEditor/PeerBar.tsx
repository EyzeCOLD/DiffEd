import type {JSX} from "react";
import type {SessionMember} from "#shared/src/types";
import {CollabPeersPool} from "./peerDocs";

type PeerBarProps = {
	peers: SessionMember[];
	selectedOwnerId: number | null;
	onSelect: (ownerId: number) => void;
	pool: CollabPeersPool;
};

export default function PeerBar({peers, selectedOwnerId, onSelect, pool}: PeerBarProps): JSX.Element {
	return (
		<div className="flex flex-row items-center gap-2 p-2 bg-surface">
			{peers.length === 0 ? (
				<span>Solo mode — share this URL to collaborate.</span>
			) : (
				<div role="tablist" aria-label="Peers" className="flex flex-row items-center gap-2">
					{peers.map((peer) => {
						const ready = pool.isReady(peer.userId);
						const selected = peer.userId === selectedOwnerId;
						const borderClass = selected ? "border-accent" : "border-transparent";
						const stateClass = ready ? "cursor-pointer" : "opacity-50 cursor-wait";
						return (
							<button
								key={peer.userId}
								type="button"
								role="tab"
								aria-selected={selected}
								disabled={!ready}
								onClick={() => onSelect(peer.userId)}
								className={`px-2 py-1 border ${borderClass} ${stateClass}`}
							>
								{peer.username}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

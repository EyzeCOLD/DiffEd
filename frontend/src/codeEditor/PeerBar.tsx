import type {JSX} from "react";
import type {WorkspaceMember} from "#shared/src/types";

type PeerBarProps = {
	peers: WorkspaceMember[];
	readyPeerIds: ReadonlySet<number>;
	selectedPeerId: number | null;
	onSelect: (ownerId: number | null) => void;
};

export default function PeerBar({peers, readyPeerIds, selectedPeerId, onSelect}: PeerBarProps): JSX.Element {
	return (
		<div className="flex flex-row items-center gap-2 p-2 bg-surface">
			{peers.length === 0 ? (
				<span>Solo mode — share this URL to collaborate.</span>
			) : (
				<div role="tablist" aria-label="Peers" className="flex flex-row items-center gap-2">
					<button
						type="button"
						role="tab"
						aria-selected={selectedPeerId === null}
						onClick={() => onSelect(null)}
						className={`text-foreground-light px-2 py-1 border ${selectedPeerId === null ? "border-accent" : "border-transparent"} cursor-pointer`}
					>
						Solo
					</button>
					{peers.map((peer) => {
						const ready = readyPeerIds.has(peer.id);
						const selected = peer.id === selectedPeerId;
						const borderClass = selected ? "border-accent" : "border-transparent";
						const stateClass = ready ? "cursor-pointer" : "opacity-50 cursor-wait";
						return (
							<button
								key={peer.id}
								type="button"
								role="tab"
								aria-selected={selected}
								disabled={!ready}
								onClick={() => onSelect(peer.id)}
								className={`text-foreground-light px-2 py-1 border ${borderClass} ${stateClass}`}
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

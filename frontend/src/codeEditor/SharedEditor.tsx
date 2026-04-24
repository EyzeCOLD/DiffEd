import {useEffect, useMemo, useRef, useState} from "react";
import type {JSX} from "react";
import type {SessionMember} from "#shared/src/types";
import {EditorState, Transaction} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {unifiedMergeView, updateOriginalDoc} from "@codemirror/merge";
import {basicSetup} from "codemirror";
import keybinds from "./keybinds";
import langServer from "./langExtensions";
import {CollabConnection, getInitialDocument} from "./collabClient";
import {CollabPeersPool, type PeerDocEvent} from "./peerDocs";
import {peerExtension} from "./peerExtension";
import PeerBar from "./PeerBar";
import {delay} from "../utils";

const INITIAL_DOC_MAX_ATTEMPTS = 2;
const INITIAL_DOC_RETRY_DELAY_MS = 250;
const RETRYABLE_INITIAL_DOC_MESSAGES = [
	"Timed out connecting to collaboration server",
	"Timed out waiting for collab response",
	"Collab connection closed",
];

const TAB_USAGE_HINT =
	"Tab inserts indentation in the editor. To move keyboard focus away from the editor, first press Escape.";

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Unknown error";
}

type SharedEditorProps = {
	connection: CollabConnection;
	myOwnerId: number;
	initialMembers: SessionMember[];
};

export default function SharedEditor({connection, myOwnerId, initialMembers}: SharedEditorProps): JSX.Element {
	const [members, setMembers] = useState<SessionMember[]>(initialMembers);
	const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
	const [readyPeerIds, setReadyPeerIds] = useState<ReadonlySet<number>>(new Set());

	const editorDomRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [prevEditorKey, setPrevEditorKey] = useState<number | "solo">("solo");

	const pool = useMemo(() => new CollabPeersPool(connection), [connection]);
	const peers = members.filter((m) => m.userId !== myOwnerId);

	useEffect(() => () => pool.dispose(), [pool]);

	useEffect(() => connection.subscribeMembers((event) => setMembers(event.members)), [connection]);

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

	// When the active peer changes, reset editor state during render rather than inside
	// the effect (calling setState in an effect body triggers cascading renders).
	const editorKey = basePeerId ?? "solo";
	if (prevEditorKey !== editorKey) {
		setPrevEditorKey(editorKey);
		setIsLoading(true);
		setError(null);
		setRetryCount(0);
	}

	useEffect(() => {
		return pool.onShadowUpdate((ownerId: number, event: PeerDocEvent) => {
			if (ownerId === basePeerId && event.changes !== null) {
				viewRef.current?.dispatch({effects: updateOriginalDoc.of({doc: event.doc.doc, changes: event.changes})});
			}
			if (event.changes === null) {
				setReadyPeerIds((prev) => new Set([...prev, ownerId]));
			}
		});
	}, [pool, basePeerId]);

	const peerInitialDoc = basePeerId === null ? null : (pool.getPeerDoc(basePeerId)?.doc ?? null);

	useEffect(() => {
		const editorElement = editorDomRef.current;
		if (!editorElement) return;

		let view: EditorView | null = null;
		let hasUnmounted = false;

		function destroyView(): void {
			view?.destroy();
			view = null;
			viewRef.current = null;
		}

		async function getInitialDocumentWithRetry() {
			for (let attempt = 1; attempt <= INITIAL_DOC_MAX_ATTEMPTS; attempt += 1) {
				try {
					return await getInitialDocument(connection, myOwnerId);
				} catch (err) {
					if (hasUnmounted) throw err;
					const message = err instanceof Error ? err.message : "";
					const isRetryable = RETRYABLE_INITIAL_DOC_MESSAGES.some((entry) => message.includes(entry));
					if (!isRetryable || attempt === INITIAL_DOC_MAX_ATTEMPTS) throw err;
					await delay(INITIAL_DOC_RETRY_DELAY_MS);
				}
			}
			throw new Error("Failed to get initial document");
		}

		async function initializeEditor(): Promise<void> {
			try {
				const {doc, version} = await getInitialDocumentWithRetry();
				if (hasUnmounted) return;

				const extensions = [
					basicSetup,
					keybinds,
					langServer.markdown(),
					...peerExtension(version, connection, myOwnerId),
				];
				if (peerInitialDoc !== null) {
					extensions.push(...unifiedMergeView({original: peerInitialDoc, allowInlineDiffs: true}));
				}

				const state = EditorState.create({doc, extensions});
				const editorView = new EditorView({
					state,
					parent: editorElement ?? undefined,
					dispatch: (tr: Transaction) => {
						editorView.update([tr]);
					},
				});
				view = editorView;
				viewRef.current = editorView;

				if (hasUnmounted) {
					destroyView();
					return;
				}

				setIsLoading(false);
			} catch (err) {
				if (hasUnmounted) return;
				setError(errorMessage(err));
				setIsLoading(false);
				console.error("Failed to initialize editor:", err);
			}
		}

		void initializeEditor();

		return function cleanup() {
			hasUnmounted = true;
			destroyView();
		};
	}, [connection, myOwnerId, peerInitialDoc, basePeerId, retryCount]);

	function retryInitialization(): void {
		setError(null);
		setIsLoading(true);
		setRetryCount((count) => count + 1);
	}

	return (
		<div className="flex flex-col h-full">
			<PeerBar peers={peers} selectedOwnerId={basePeerId} onSelect={setSelectedPeerId} pool={pool} />
			<div ref={editorDomRef} className={`h-full w-full${error ? " hidden" : ""}`} />
			{error ? (
				<div className="border border-red-500 p-2 text-red-500">
					<div>Error initializing editor: {error}</div>
					<button className="mt-2 border px-2 py-1" onClick={retryInitialization} type="button">
						Retry
					</button>
				</div>
			) : isLoading ? (
				<div className="p-2">Initializing collaborative editor...</div>
			) : null}
			<p className="m-0 text-sm text-(--text-secondary)">{TAB_USAGE_HINT}</p>
		</div>
	);
}

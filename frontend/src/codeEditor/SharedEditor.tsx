import {useEffect, useMemo, useRef, useState} from "react";
import type {JSX} from "react";
import type {SessionMember} from "#shared/src/types";
import {EditorState, Transaction} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {unifiedMergeView, updateOriginalDoc} from "@codemirror/merge";
import {basicSetup} from "codemirror";
import keybinds from "./keybinds";
import langServer from "./langExtensions";
import {CollabConnection, getInitialDocument, pushFileName} from "./collabClient";
import {CollabPeersPool, type PeerDocEvent} from "./peerDocs";
import {peerExtension} from "./peerExtension";
import PeerBar from "./PeerBar";
import {delay} from "../utils";
import {Input} from "../components/Input";
import {Button} from "../components/Button";

const INITIAL_DOC_MAX_ATTEMPTS = 2;
const INITIAL_DOC_RETRY_DELAY_MS = 250;
const RETRYABLE_INITIAL_DOC_MESSAGES = [
	"Timed out connecting to collaboration server",
	// "Timed out waiting for collab response",
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
	const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
	const [readyPeerIds, setReadyPeerIds] = useState<ReadonlySet<number>>(new Set());

	const editorDomRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [fileName, setFileName] = useState("");
	const [prevEditorKey, setPrevEditorKey] = useState<number | "solo">("solo");

	const [pool] = useState(() => new CollabPeersPool(connection, myOwnerId, initialMembers));
	const [members, setMembers] = useState<SessionMember[]>(() => pool.getMembers());

	useEffect(() => () => pool.dispose(), [pool]);

	useEffect(() => pool.onMembersChange(setMembers), [pool]);

	const basePeerId = useMemo(() => {
		if (selectedPeerId !== null && members.some((p) => p.id === selectedPeerId)) {
			return selectedPeerId;
		}
		const firstReady = members.find((p) => readyPeerIds.has(p.id));
		return firstReady?.id ?? null;
	}, [selectedPeerId, members, readyPeerIds]);

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
		return pool.onDocUpdate((ownerId: number, event: PeerDocEvent) => {
			if (ownerId === basePeerId && event.changes !== null) {
				viewRef.current?.dispatch({effects: updateOriginalDoc.of({doc: event.doc.doc, changes: event.changes})});
			}
			if (event.changes === null) {
				setReadyPeerIds((prev) => new Set([...prev, ownerId]));
			}
		});
	}, [pool, basePeerId]);

	const memberInitialDoc = basePeerId === null ? null : (pool.getPeerDoc(basePeerId)?.doc ?? null);

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
				const {doc, version, fileName: initialFileName} = await getInitialDocumentWithRetry();
				if (hasUnmounted) return;
				setFileName(initialFileName);

				const extensions = [
					basicSetup,
					keybinds,
					langServer.markdown(),
					...peerExtension(version, connection, myOwnerId),
				];
				if (memberInitialDoc !== null) {
					extensions.push(
						...unifiedMergeView({
							original: memberInitialDoc,
							allowInlineDiffs: false,
							mergeControls: (type, action) => {
								// We're comparing with the member as the base doc, meaning the native "accept" would modify the member's doc locally.
								// We don't want that, so we hide the "accept" button
								if (type === "accept") {
									const el = document.createElement("span");
									el.style.display = "none";
									return el;
								}
								// We repurpose the native "reject" button to seem like an "Accept",
								// because it overrides the diffed doc (which is the user's own doc) based on the member
								const btn = document.createElement("button");
								btn.textContent = "Accept";
								btn.addEventListener("click", action);
								return btn;
							},
						}),
					);
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
	}, [connection, myOwnerId, memberInitialDoc, basePeerId, retryCount]);

	function retryInitialization(): void {
		setError(null);
		setIsLoading(true);
		setRetryCount((count) => count + 1);
	}

	async function handleRename(): Promise<void> {
		if (!connection) return;
		const response = await pushFileName(connection, fileName);
		setFileName(response.name);
	}

	return (
		<div className="flex flex-col h-full">
			<PeerBar peers={members} readyPeerIds={readyPeerIds} selectedPeerId={basePeerId} onSelect={setSelectedPeerId} />
			{error ? (
				<div className="border border-red-500 p-2 text-red-500">
					<div>Error initializing editor: {error}</div>
					<Button onClick={retryInitialization} type="button">
						Retry
					</Button>
				</div>
			) : isLoading ? (
				<div className="p-2">Initializing collaborative editor...</div>
			) : (
				<form
					className="flex gap-2 p-1"
					onSubmit={(e) => {
						e.preventDefault();
						void handleRename();
					}}
				>
					<Input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
					<Button type="submit" className="border px-2">
						Rename
					</Button>
				</form>
			)}
			<div ref={editorDomRef} className="h-full w-full" />
			<p className="m-0 text-sm text-(--text-secondary)">{TAB_USAGE_HINT}</p>
		</div>
	);
}

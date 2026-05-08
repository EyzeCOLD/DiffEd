import {useEffect, useMemo, useRef, useState} from "react";
import type {JSX} from "react";
import type {WorkspaceMember} from "#shared/src/types";
import {EditorState, Transaction} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {updateOriginalDoc} from "@codemirror/merge";
import {CollabConnection, getInitialDocument, pushFileName, pullFileName} from "./collabClient";
import {CollabPeersPool} from "./collabPeerDocs";
import {getEditorExtensions, getLangExtension, langOptions, langCompartment} from "./editorConfigs";
import PeerBar from "./PeerBar";
import {delay} from "../utils";
import {Input} from "../components/Input";
import {Button} from "../components/Button";
import {useShowToast} from "../stores/toastStore";

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
	initialMembers: WorkspaceMember[];
	onRepickFile: () => void;
};

export default function Editor({connection, myOwnerId, initialMembers, onRepickFile}: SharedEditorProps): JSX.Element {
	const showToast = useShowToast();
	const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
	const [readyPeerIds, setReadyPeerIds] = useState<ReadonlySet<number>>(new Set());

	const editorDomRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [fileName, setFileName] = useState("");
	const [langSelected, setLangOverride] = useState<string | null>(null);
	const [prevEditorKey, setPrevEditorKey] = useState<number | "solo">("solo");

	const [members, setMembers] = useState<WorkspaceMember[]>(() => initialMembers.filter((m) => m.id !== myOwnerId));

	const [pool] = useState(
		() =>
			new CollabPeersPool(
				connection,
				myOwnerId,
				initialMembers,
				(m) => setMembers(m),
				(ownerId) => setReadyPeerIds((prev) => new Set([...prev, ownerId])),
			),
	);

	useEffect(() => {
		let done = false;
		(async () => {
			while (!done) {
				try {
					const name = await pullFileName(connection);
					if (!done) setFileName(name);
				} catch {
					if (!done) await delay(1000);
				}
			}
		})();
		return () => {
			done = true;
		};
	}, [connection]);

	useEffect(() => () => pool.dispose(), [pool]);

	const basePeerId = useMemo(() => {
		if (selectedPeerId !== null && members.some((p) => p.id === selectedPeerId)) {
			return selectedPeerId;
		}
		return null;
	}, [selectedPeerId, members]);

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
		return pool.onPeerUpdate((ownerId, doc, changes) => {
			if (ownerId === basePeerId) {
				viewRef.current?.dispatch({effects: updateOriginalDoc.of({doc: doc.doc, changes})});
			}
		});
	}, [pool, basePeerId]);

	useEffect(() => {
		if (!viewRef.current) return;
		const extension = langSelected ? (langOptions[langSelected]?.() ?? []) : getLangExtension(fileName);
		viewRef.current.dispatch({effects: langCompartment.reconfigure(extension)});
	}, [langSelected, fileName]);

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

				const state = EditorState.create({
					doc,
					extensions: getEditorExtensions({
						langExtension: getLangExtension(initialFileName),
						version,
						connection,
						myOwnerId,
						memberInitialDoc,
					}),
				});
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
		try {
			const response = await pushFileName(connection, fileName);
			setFileName(response.name);
		} catch (err) {
			showToast("error", errorMessage(err));
		}
	}

	return (
		<div className="flex flex-col h-full">
			<PeerBar
				peers={members}
				readyPeerIds={readyPeerIds}
				selectedPeerId={selectedPeerId}
				onSelect={setSelectedPeerId}
			/>
			<div className="flex items-center justify-between p-1">
				<form
					className="flex gap-2"
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
				<div className="flex items-center">
					<select
						className="m-1 px-1 border-2 border-surface bg-canvas text-foreground"
						value={langSelected ?? ""}
						onChange={(e) => setLangOverride(e.target.value || null)}
					>
						<option className="bg-canvas" value="">
							File syntax
						</option>
						{Object.keys(langOptions).map((name) => (
							<option className="bg-canvas" key={name} value={name}>
								{name}
							</option>
						))}
					</select>
					<Button type="button" className="border px-2" onClick={onRepickFile}>
						Change file
					</Button>
				</div>
			</div>
			{error ? (
				<div className="border border-error-accent p-2 text-error-accent">
					<div>Error initializing editor: {error}</div>
					<Button onClick={retryInitialization} type="button">
						Retry
					</Button>
				</div>
			) : isLoading ? (
				<div className="p-2">Initializing collaborative editor...</div>
			) : null}
			<div ref={editorDomRef} className="h-full w-full" />
			<p className="m-0 text-sm text-(--text-secondary)">{TAB_USAGE_HINT}</p>
		</div>
	);
}

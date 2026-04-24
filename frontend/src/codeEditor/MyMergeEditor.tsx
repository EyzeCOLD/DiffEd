import {useEffect, useImperativeHandle, useRef, useState, forwardRef} from "react";
import type {JSX, Ref} from "react";
import {ChangeSet, EditorState, Text, Transaction} from "@codemirror/state";
import {EditorView, ViewUpdate, ViewPlugin, type PluginValue} from "@codemirror/view";
import {collab, getSyncedVersion, sendableUpdates, receiveUpdates} from "@codemirror/collab";
import {unifiedMergeView, updateOriginalDoc} from "@codemirror/merge";
import {basicSetup} from "codemirror";
import keybinds from "./keybinds";
import langServer from "./langExtensions";
import {CollabConnection, pushUpdates, pullUpdates, getInitialDocument} from "./collabClient";

const INITIAL_DOC_MAX_ATTEMPTS = 2;
const INITIAL_DOC_RETRY_DELAY_MS = 250;
const RETRYABLE_INITIAL_DOC_MESSAGES = [
	"Timed out connecting to collaboration server",
	"Timed out waiting for collab response",
	"Collab connection closed",
];

const PUSH_MS_INTERVAL = 100;
const PULL_MS_INTERVAL = 1000;

function peerExtension(startVersion: number, connection: CollabConnection, ownerId: number) {
	class LocalPeerPlugin implements PluginValue {
		pushing = false;
		done = false;
		view: EditorView;

		constructor(v: EditorView) {
			this.view = v;
			void this.pull();
		}

		update(update: ViewUpdate): void {
			if (update.docChanged) {
				void this.push();
			}
		}

		async push(): Promise<void> {
			const updates = sendableUpdates(this.view.state);
			if (this.pushing || !updates.length) return;
			this.pushing = true;
			const version = getSyncedVersion(this.view.state);
			try {
				await pushUpdates(connection, version, updates);
			} catch (error) {
				console.error("Failed to push updates:", error);
			}
			this.pushing = false;

			if (sendableUpdates(this.view.state).length) {
				setTimeout(() => void this.push(), PUSH_MS_INTERVAL);
			}
		}

		async pull(): Promise<void> {
			while (!this.done) {
				const version = getSyncedVersion(this.view.state);
				try {
					const updates = await pullUpdates(connection, ownerId, version);
					if (this.done) return;
					this.view.dispatch(receiveUpdates(this.view.state, updates));
				} catch (error) {
					if (this.done) return;

					console.error("Failed to pull updates:", error);

					await new Promise((resolve) => setTimeout(resolve, PULL_MS_INTERVAL));
				}
			}
		}

		destroy(): void {
			this.done = true;
		}
	}

	const plugin = ViewPlugin.fromClass(LocalPeerPlugin);
	return [collab({startVersion}), plugin];
}

export type MyMergeEditorHandle = {
	updateOriginal: (doc: Text, changes: ChangeSet) => void;
};

type MyMergeEditorProps = {
	connection: CollabConnection;
	myOwnerId: number;
	peerInitialDoc: Text | null;
};

function MyMergeEditorInner(
	{connection, myOwnerId, peerInitialDoc}: MyMergeEditorProps,
	ref: Ref<MyMergeEditorHandle>,
): JSX.Element {
	const editorRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const tabUsageHintText =
		"Tab inserts indentation in the editor. To move keyboard focus away from the editor, first press Escape.";

	useImperativeHandle(ref, () => ({
		updateOriginal(doc: Text, changes: ChangeSet) {
			const view = viewRef.current;
			if (!view) return;
			view.dispatch({effects: updateOriginalDoc.of({doc, changes})});
		},
	}));

	useEffect(() => {
		const editorElement = editorRef.current;
		if (!editorElement) return;
		let view: EditorView | null = null;
		let hasUnmounted = false;

		async function getInitialDocumentWithRetry() {
			for (let attempt = 1; attempt <= INITIAL_DOC_MAX_ATTEMPTS; attempt += 1) {
				try {
					return await getInitialDocument(connection, myOwnerId);
				} catch (error) {
					if (hasUnmounted) {
						throw error;
					}

					const message = error instanceof Error ? error.message : "";
					const isRetryable = RETRYABLE_INITIAL_DOC_MESSAGES.some((entry) => message.includes(entry));
					if (!isRetryable || attempt === INITIAL_DOC_MAX_ATTEMPTS) {
						throw error;
					}

					await new Promise((resolve) => setTimeout(resolve, INITIAL_DOC_RETRY_DELAY_MS));
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
					view.destroy();
					view = null;
					viewRef.current = null;
					return;
				}

				setIsLoading(false);
			} catch (err) {
				if (hasUnmounted) return;

				const message = err instanceof Error ? err.message : "Unknown error";
				setError(message);
				setIsLoading(false);
				console.error("Failed to initialize editor:", err);
			}
		}

		void initializeEditor();

		return function cleanup() {
			hasUnmounted = true;
			if (view) {
				view.destroy();
				view = null;
				viewRef.current = null;
			}
		};
	}, [connection, myOwnerId, peerInitialDoc, retryCount]);

	function retryInitialization(): void {
		setError(null);
		setIsLoading(true);
		setRetryCount((count) => count + 1);
	}

	return (
		<div className="h-full w-full">
			<div className="relative h-full w-full">
				<div ref={editorRef} className={`h-full w-full${error ? " hidden" : ""}`} />
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
			</div>
			<p className="m-0 text-sm text-(--text-secondary)">{tabUsageHintText}</p>
		</div>
	);
}

const MyMergeEditor = forwardRef<MyMergeEditorHandle, MyMergeEditorProps>(MyMergeEditorInner);
export default MyMergeEditor;

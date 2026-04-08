import {useEffect, useRef, useState} from "react";
import type {JSX} from "react";
import {EditorState, Transaction} from "@codemirror/state";
import {EditorView, ViewUpdate, ViewPlugin, type PluginValue} from "@codemirror/view";
import {collab, getSyncedVersion, sendableUpdates, receiveUpdates} from "@codemirror/collab";
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

function peerExtension(startVersion: number, connection: CollabConnection) {
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
					const updates = await pullUpdates(connection, version);
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

type CodeEditorProps = {
	fileId: string;
	connection: CollabConnection;
	onChange?: (value: string) => void;
};

export default function CodeEditor({fileId, connection, onChange}: CodeEditorProps): JSX.Element {
	const editorRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const onChangeRef = useRef<(value: string) => void>(onChange);
	const tabUsageHintId = `tab-usage-hint-${fileId}`;
	const tabUsageHintText =
		"Tab inserts indentation in the editor. To move keyboard focus away from the editor, first press Escape.";

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		const editorElement = editorRef.current;
		if (!editorElement) return;
		let view: EditorView | null = null;
		let hasUnmounted = false;

		// Rapid back/forward navigation can interrupt the first collab request,
		// so retry once before showing an initialization error.
		async function getInitialDocumentWithRetry() {
			for (let attempt = 1; attempt <= INITIAL_DOC_MAX_ATTEMPTS; attempt += 1) {
				try {
					return await getInitialDocument(connection);
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
				if (hasUnmounted) {
					return;
				}

				const state = EditorState.create({
					doc,
					extensions: [basicSetup, keybinds, langServer.markdown(), ...peerExtension(version, connection)],
				});

				const editorView = new EditorView({
					state,
					parent: editorElement ?? undefined,
					dispatch: (tr: Transaction) => {
						editorView.update([tr]);

						if (tr.docChanged && onChangeRef.current) {
							onChangeRef.current(editorView.state.doc.toString());
						}
					},
				});
				view = editorView;

				// If the page was left while the editor was initializing, discard the
				// editor instance instead of mounting stale UI.
				if (hasUnmounted) {
					view.destroy();
					view = null;
					return;
				}

				setIsLoading(false);
			} catch (err) {
				if (hasUnmounted) {
					return;
				}

				const message = err instanceof Error ? err.message : "Unknown error";
				setError(message);
				setIsLoading(false);
				console.error("Failed to initialize editor:", err);
			}
		}

		void initializeEditor();

		return function cleanup() {
			// Prevent async startup work from updating state after navigation away.
			hasUnmounted = true;
			if (view) {
				view.destroy();
				view = null;
			}
		};
	}, [fileId, connection]);

	return (
		<div className="h-full w-full">
			<div className="relative h-full w-full" aria-describedby={tabUsageHintId}>
				<div ref={editorRef} className={"h-full w-full" + (error ? " hidden" : "")} />
				{error ? (
					<div className="border border-red-500 p-2 text-red-500">Error initializing editor: {error}</div>
				) : isLoading ? (
					<div className="p-2">Initializing collaborative editor...</div>
				) : null}
			</div>
			<p id={tabUsageHintId} className="m-0 text-sm text-(--text-secondary)">
				{tabUsageHintText}
			</p>
		</div>
	);
}

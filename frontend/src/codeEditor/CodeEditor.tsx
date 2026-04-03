import {useEffect, useRef, useState} from "react";
import type {JSX} from "react";
import {EditorState, Transaction} from "@codemirror/state";
import {EditorView, ViewUpdate, ViewPlugin, type PluginValue} from "@codemirror/view";
import {collab, getSyncedVersion, sendableUpdates, receiveUpdates} from "@codemirror/collab";
import {basicSetup} from "codemirror";
import langServer from "./langExtensions";
import {CollabConnection, pushUpdates, pullUpdates, getInitialDocument} from "./collabClient";
import styles from "./CodeEditor.module.css";

const PUSH_MS_INTERVAL = 100;
const PULL_MS_INTERVAL = 1000;

type CodeEditorProps = {
	fileId: string;
	onChange?: (value: string) => void;
};

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

export default function CodeEditor({fileId, onChange}: CodeEditorProps): JSX.Element {
	const editorRef = useRef<HTMLDivElement>(null);
	const connectionRef = useRef<CollabConnection | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const onChangeRef = useRef<(value: string) => void>(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		const editorElement = editorRef.current;
		if (!editorElement) return;
		let view: EditorView | null = null;

		const initializeEditor = async (): Promise<void> => {
			try {
				connectionRef.current = new CollabConnection(fileId);
				const {doc, version} = await getInitialDocument(connectionRef.current);
				const state = EditorState.create({
					doc,
					extensions: [basicSetup, langServer.markdown(), ...peerExtension(version, connectionRef.current)],
				});

				const editorView = new EditorView({
					state,
					parent: editorElement,
					dispatch: (tr: Transaction) => {
						editorView.update([tr]);

						if (tr.docChanged && onChangeRef.current) {
							onChangeRef.current(editorView.state.doc.toString());
						}
					},
				});
				view = editorView;

				setIsLoading(false);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				setError(message);
				setIsLoading(false);
				console.error("Failed to initialize editor:", err);
			}
		};

		void initializeEditor();

		return () => {
			// Cleanup
			if (view) {
				view.destroy();
				view = null;
			}
			if (connectionRef.current) {
				connectionRef.current.disconnect();
				connectionRef.current = null;
			}
		};
	}, [fileId]);

	if (error) {
		return (
			<div className={styles.container}>
				<div ref={editorRef} className={`${styles.editorHost} ${styles.hidden}`} />
				<div className={styles.errorMessage}>Error initializing editor: {error}</div>
			</div>
		);
	}

	return (
		<div className={styles.relativeContainer}>
			<div ref={editorRef} className={styles.editorHost} />
			{isLoading ? <div className={styles.loadingOverlay}>Initializing collaborative editor...</div> : null}
		</div>
	);
}

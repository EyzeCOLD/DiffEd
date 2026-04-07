import {useEffect, useRef, useState} from "react";
import type {JSX} from "react";
import {EditorState} from "@codemirror/state";
import {unifiedMergeView} from "@codemirror/merge";
import {EditorView, ViewUpdate, ViewPlugin, type PluginValue} from "@codemirror/view";
import {collab, getSyncedVersion, sendableUpdates, receiveUpdates} from "@codemirror/collab";
import {basicSetup} from "codemirror";
import langServer from "./langExtensions";
import {CollabConnection, pushUpdates, pullUpdates, getInitialDocument} from "./collabClient";

const PUSH_MS_INTERVAL = 100;
const PULL_MS_INTERVAL = 1000;

const theme = EditorView.theme({
	// ".cm-gutters": {backgroundColor: "#000"},
	// ".cm-deletedChunk": {backgroundColor: "#ffe4e6", borderLeft: "3px solid #e11d48"},
	// ".cm-deletedLine": {backgroundColor: "#ffe4e6"},
	// ".cm-insertedLine": {backgroundColor: "#dcfce7"},
	// ".cm-changedLine": {backgroundColor: "#fef9c3"},
	// ".cm-changedText": {backgroundColor: "#fde68a"},
	// ".cm-changeGutter": {backgroundColor: "#ffedd5"},
	// ".cm-deletedLineGutter": {backgroundColor: "#ffe4e6"},
	// ".cm-changedLineGutter": {backgroundColor: "#fef9c3"},
});

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

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		const editorElement = editorRef.current;
		if (!editorElement) return;
		let view: EditorView | null = null;

		async function initializeEditor(): Promise<void> {
			try {
				const {doc, version} = await getInitialDocument(connection);
				const state = EditorState.create({
					doc,
					extensions: [
						basicSetup,
						EditorView.updateListener.of((update) => {
							if (update.docChanged && onChangeRef.current) {
								onChangeRef.current(update.state.doc.toString());
							}
						}),
						langServer.markdown(),
						unifiedMergeView({
							original: doc,
							gutter: true,
							mergeControls: true,
							allowInlineDiffs: true,
							highlightChanges: true,
						}),
						theme,
						...peerExtension(version, connection),
					],
				});

				const editorView = new EditorView({
					state,
					parent: editorElement ?? undefined,
				});
				view = editorView;

				setIsLoading(false);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				setError(message);
				setIsLoading(false);
				console.error("Failed to initialize editor:", err);
			}
		}

		void initializeEditor();

		return function cleanup() {
			if (view) {
				view.destroy();
				view = null;
			}
		};
	}, [fileId, connection]);

	if (error) {
		return (
			<div className="h-full w-full">
				<div className="border border-red-500 p-2 text-red-500">Error initializing editor: {error}</div>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			{isLoading ? <div className="absolute inset-0 p-2">Initializing collaborative editor...</div> : null}
			<div ref={editorRef} className="h-full w-full" />
		</div>
	);
}

import {defaultKeymap, insertTab} from "@codemirror/commands";
import {type Extension, Text} from "@codemirror/state";
import {keymap, EditorView} from "@codemirror/view";
import {unifiedMergeView} from "@codemirror/merge";
import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";
import {basicSetup} from "codemirror";
import {type CollabConnection} from "./collabClient";
import {peerExtension} from "./peerExtension";

const keybinds = keymap.of([
	...defaultKeymap,
	{
		key: "Tab",
		preventDefault: true,
		run: insertTab,
	},
]);

export const langServer = {
	markdown: () => markdown({codeLanguages: languages}),
} satisfies Record<string, () => ReturnType<typeof markdown>>;
type EditorConfig = {
	langExtension: Extension;
	version: number;
	connection: CollabConnection;
	myOwnerId: number;
	memberInitialDoc: Text | null;
};

export function getEditorExtensions({
	langExtension,
	version,
	connection,
	myOwnerId,
	memberInitialDoc,
}: EditorConfig): Extension[] {
	const extensions: Extension[] = [
		basicSetup,
		keybinds,
		langExtension,
		...peerExtension(version, connection, myOwnerId),
		EditorView.theme({
			// Hide mergeControl buttons on chunks that only have additions by self
			"& .cm-deletedChunk:not(:has(.cm-deletedLine)) .cm-chunkButtons": {display: "none"},

			// Add borders and rounded corners for chunks that have deletions,
			// making it distinguish what Accept actions would affect
			"& .cm-deletedChunk:has(.cm-deletedLine):has(+ .cm-line.cm-changedLine)": {
				borderTop: "1px solid var(--color-surface)",
				borderLeft: "1px solid var(--color-surface)",
				borderRight: "1px solid var(--color-surface)",
				borderRadius: "0.15rem 0.15rem 0 0",
			},
			"& .cm-deletedChunk:has(.cm-deletedLine) ~ .cm-line.cm-changedLine": {
				borderLeft: "1px solid var(--color-surface)",
				borderRight: "1px solid var(--color-surface)",
			},
			"& .cm-deletedChunk:has(.cm-deletedLine) ~ .cm-line.cm-changedLine:not(:has(+ .cm-line.cm-changedLine))": {
				borderBottom: "1px solid var(--color-surface)",
				borderRadius: "0 0 0.15rem 0.15rem",
			},

			// Styles the `deleted` (addable from peer) lines and `changed` (added by self compared to peer) lines
			"& .cm-deletedChunk": {backgroundColor: "color-mix(in srgb, var(--color-success-accent) 5%, transparent)"},
			"& .cm-deletedChunk .cm-deletedLine": {
				backgroundColor: "color-mix(in srgb, var(--color-success-accent) 12%, transparent)",
				textDecoration: "none",
			},
			"& .cm-deletedChunk .cm-deletedLine del": {textDecoration: "none"},
			"& .cm-deletedChunk .cm-deletedText": {
				backgroundColor: "color-mix(in srgb, var(--color-success-accent) 28%, transparent)",
			},
			"& .cm-changedLine": {backgroundColor: "color-mix(in srgb, grey 12%, transparent)"},
			"& .cm-changedText": {backgroundColor: "color-mix(in srgb, grey 28%, transparent)"},

			// Styles the line gutter and diff indicators
			"& .cm-gutters": {backgroundColor: "transparent", color: "var(--color-foreground)"},
			"& .cm-changeGutter": {paddingLeft: "unset"},
			"& .cm-changedLineGutter, &.cm-merge-b .cm-changedLineGutter": {
				backgroundColor: "color-mix(in srgb, grey 12%, transparent)",
			},
			"& .cm-deletedLineGutter, &.cm-merge-a .cm-deletedLineGutter": {
				backgroundColor: "var(--color-success-accent)",
			},

			// Styles the cursor's current line
			"& .cm-activeLine, &.cm-merge-b .cm-activeLine": {backgroundColor: "#cceeff44"},
			"& .cm-activeLineGutter, &.cm-merge-b .cm-activeLineGutter": {
				backgroundColor: "#cceeff44",
			},

			// Styles the button to expand section folds
			"& .cm-foldPlaceholder": {
				backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
				border: "1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)",
				color: "var(--color-foreground)",
				borderRadius: "0.2rem",
			},

			// Styles the input cursor
			"& .cm-cursor, & .cm-cursorAnchor": {borderLeftColor: "var(--color-accent)"},
		}),
	];

	if (memberInitialDoc) {
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

	return extensions;
}

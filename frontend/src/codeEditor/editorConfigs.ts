import {defaultKeymap, insertTab} from "@codemirror/commands";
import {type Extension, Text} from "@codemirror/state";
import {keymap} from "@codemirror/view";
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

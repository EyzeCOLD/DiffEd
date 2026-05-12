import {defaultKeymap, insertTab} from "@codemirror/commands";
import {type Extension, Text, Compartment} from "@codemirror/state";
import {keymap, EditorView} from "@codemirror/view";
import {vim} from "@replit/codemirror-vim";
import {unifiedMergeView} from "@codemirror/merge";
import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";
import {javascript} from "@codemirror/lang-javascript";
import {python} from "@codemirror/lang-python";
import {html} from "@codemirror/lang-html";
import {css} from "@codemirror/lang-css";
import {json} from "@codemirror/lang-json";
import {sql} from "@codemirror/lang-sql";
import {rust} from "@codemirror/lang-rust";
import {cpp} from "@codemirror/lang-cpp";
import {java} from "@codemirror/lang-java";
import {php} from "@codemirror/lang-php";
import {xml} from "@codemirror/lang-xml";
import {basicSetup} from "codemirror";
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {type CollabConnection} from "./collabClient";
import {peerExtension} from "./peerExtension";

const langServer = {
	md: () => markdown({codeLanguages: languages}),
	cpp: () => cpp(),
	cc: () => cpp(),
	cxx: () => cpp(),
	c: () => cpp(),
	h: () => cpp(),
	hpp: () => cpp(),
	html: () => html(),
	htm: () => html(),
	css: () => css(),
	ts: () => javascript({typescript: true}),
	mts: () => javascript({typescript: true}),
	cts: () => javascript({typescript: true}),
	js: () => javascript(),
	mjs: () => javascript(),
	cjs: () => javascript(),
	tsx: () => javascript({jsx: true, typescript: true}),
	jsx: () => javascript({jsx: true}),
	json: () => json(),
	sql: () => sql(),
	rs: () => rust(),
	py: () => python(),
	java: () => java(),
	php: () => php(),
	xml: () => xml(),
	svg: () => xml(),
} satisfies Record<string, () => Extension>;

export const langOptions: Record<string, () => Extension> = {
	Markdown: langServer.md,
	"C/C++": langServer.cpp,
	HTML: langServer.html,
	CSS: langServer.css,
	TypeScript: langServer.ts,
	JavaScript: langServer.js,
	TSX: langServer.tsx,
	JSX: langServer.jsx,
	JSON: langServer.json,
	SQL: langServer.sql,
	Rust: langServer.rs,
	Python: langServer.py,
	Java: langServer.java,
	PHP: langServer.php,
	"XML/SVG": langServer.xml,
};

const extToLangOption: Record<keyof typeof langServer, keyof typeof langOptions> = {
	md: "Markdown",
	cpp: "C/C++",
	cc: "C/C++",
	cxx: "C/C++",
	c: "C/C++",
	h: "C/C++",
	hpp: "C/C++",
	html: "HTML",
	htm: "HTML",
	css: "CSS",
	ts: "TypeScript",
	mts: "TypeScript",
	cts: "TypeScript",
	js: "JavaScript",
	mjs: "JavaScript",
	cjs: "JavaScript",
	tsx: "TSX",
	jsx: "JSX",
	json: "JSON",
	sql: "SQL",
	rs: "Rust",
	py: "Python",
	java: "Java",
	php: "PHP",
	xml: "XML/SVG",
	svg: "XML/SVG",
};

function getFileExtension(fileName: string): string | null {
	const lastDotIndex = fileName.lastIndexOf(".");
	if (lastDotIndex === -1) return null;
	return fileName.substring(lastDotIndex + 1).toLowerCase();
}

export function getLangExtension(fileName: string): Extension {
	const extension = getFileExtension(fileName);
	if (extension && extension in langServer) {
		return langServer[extension as keyof typeof langServer]();
	}
	return [];
}

export function getLangOption(fileName: string): string | null {
	const extension = getFileExtension(fileName);
	if (extension && extension in extToLangOption) {
		return extToLangOption[extension as keyof typeof extToLangOption];
	}
	return null;
}

const codeHighlight = HighlightStyle.define([
	// if / const / import / typeof / === …
	{
		tag: [
			tags.keyword,
			tags.controlKeyword,
			tags.definitionKeyword,
			tags.moduleKeyword,
			tags.operatorKeyword,
			tags.operator,
			tags.attributeName,
		],
		color: "var(--color-syntax-keyword)",
	},
	// "hello" / `template` / /regex/
	{tag: [tags.string, tags.special(tags.string), tags.regexp], color: "var(--color-syntax-string)"},
	// // line and /* block */ comments
	{tag: tags.comment, color: "var(--color-syntax-comment)", fontStyle: "italic"},
	// 42 / true / null
	{tag: [tags.number, tags.bool, tags.null], color: "var(--color-syntax-number)"},
	// function name at call site and at definition
	{
		tag: [tags.function(tags.variableName), tags.function(tags.definition(tags.variableName))],
		color: "var(--color-syntax-function)",
	},
	// MyClass / string (TS type) / namespace / <div> (HTML/JSX tag)
	{tag: [tags.typeName, tags.className, tags.namespace, tags.tagName], color: "var(--color-syntax-type)"},
	// obj.property
	{tag: tags.propertyName, color: "var(--color-accent)"},
	// markdown
	{tag: tags.heading, color: "var(--color-syntax-function)", fontWeight: "bold"},
	{tag: tags.emphasis, fontStyle: "italic"},
	{tag: tags.strong, fontWeight: "bold"},
	{tag: [tags.link, tags.url], color: "var(--color-syntax-function)", textDecoration: "underline"},
]);

export const langCompartment = new Compartment();
export const vimCompartment = new Compartment();

type EditorConfig = {
	langExtension: Extension;
	version: number;
	connection: CollabConnection;
	myOwnerId: number;
	memberInitialDoc: Text | null;
	vimBindings: boolean;
	onVimToggle: () => void;
};

export function getEditorExtensions({
	langExtension,
	version,
	connection,
	myOwnerId,
	memberInitialDoc,
	vimBindings,
	onVimToggle,
}: EditorConfig): Extension[] {
	const keybinds = keymap.of([
		...defaultKeymap,
		{key: "Tab", preventDefault: true, run: insertTab},
		{
			key: "Ctrl-Alt-v",
			run: () => {
				onVimToggle();
				return true;
			},
		},
	]);

	const extensions: Extension[] = [
		vimCompartment.of(vimBindings ? vim() : []),
		basicSetup,
		syntaxHighlighting(codeHighlight),
		keybinds,
		langCompartment.of(langExtension),
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
			"& .cm-activeLine, &.cm-merge-b .cm-activeLine": {
				backgroundColor: "color-mix(in srgb, var(--color-accent) 7.5%, transparent)",
			},
			"& .cm-activeLineGutter, &.cm-merge-b .cm-activeLineGutter": {
				backgroundColor: "color-mix(in srgb, var(--color-accent) 7.5%, transparent)",
			},

			// Styles the button to expand section folds
			"& .cm-foldPlaceholder": {
				backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
				border: "1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)",
				color: "var(--color-foreground)",
				borderRadius: "0.2rem",
			},

			// Styles the input cursor (normal mode) and vim block cursor
			"& .cm-cursor, & .cm-cursorAnchor": {borderLeftColor: "var(--color-accent)"},
			"& .cm-fat-cursor": {
				backgroundColor: "color-mix(in srgb, var(--color-accent) 50%, transparent) !important",
				outline: "none !important",
			},

			"& .cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
				backgroundColor: "color-mix(in srgb, var(--color-accent) 12.5%, transparent) !important",
			},

			// Styles the vim command-line panel
			"& .cm-panels": {backgroundColor: "var(--color-surface)", color: "var(--color-foreground)"},
			"& .cm-panels .cm-vim-panel": {
				borderTop: "1px solid color-mix(in srgb, var(--color-foreground) 12.5%, transparent)",
				padding: "2px 4px",
			},
			"& .cm-panels .cm-vim-panel input": {
				backgroundColor: "transparent",
				color: "var(--color-foreground)",
				outline: "none",
			},
			"& .cm-panels .cm-vim-message": {
				color: "var(--color-foreground) !important",
				borderLeft: "3px solid var(--color-accent)",
				paddingLeft: "6px",
			},
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

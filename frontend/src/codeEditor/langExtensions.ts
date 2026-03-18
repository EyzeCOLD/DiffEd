import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";
import type {ReactCodeMirrorProps} from "@uiw/react-codemirror";

export default {
	markdown: () => markdown({codeLanguages: languages}),
} satisfies Record<string, () => NonNullable<ReactCodeMirrorProps["extensions"]>[number]>;

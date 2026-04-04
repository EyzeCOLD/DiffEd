import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";

export default {
	markdown: () => markdown({codeLanguages: languages}),
} satisfies Record<string, () => ReturnType<typeof markdown>>;

import {defaultKeymap, insertTab} from "@codemirror/commands";
import {keymap} from "@codemirror/view";

export default keymap.of([
	...defaultKeymap,
	{
		key: "Tab",
		preventDefault: true,
		run: insertTab,
	},
]);

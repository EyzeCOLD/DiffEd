import type {ReactCodeMirrorProps} from "@uiw/react-codemirror";
import {useCallback, useState} from "react";
import CodeMirror from "@uiw/react-codemirror";
import langs from "./langExtensions";

export default function CodeEditor() {
	const [code, setCode] = useState<string>(
		`
# title

description

## undertitle

abcde




\`\`\`js

const here = "value";

\`\`\`
	
	`,
	);

	const onChange = useCallback<NonNullable<ReactCodeMirrorProps["onChange"]>>((value) => {
		setCode(value);
		console.log(value);
	}, []);

	return <CodeMirror theme={"dark"} extensions={[langs.markdown()]} value={code} onChange={onChange} />;
}

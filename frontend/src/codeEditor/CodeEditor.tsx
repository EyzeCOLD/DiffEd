import type {ReactCodeMirrorProps} from "@uiw/react-codemirror";
import CodeMirror from "@uiw/react-codemirror";
import langs from "./langExtensions";

export default function CodeEditor({value, onChange}: {value: string; onChange: ReactCodeMirrorProps["onChange"]}) {
	return <CodeMirror theme={"dark"} extensions={[langs.markdown()]} value={value} onChange={onChange} />;
}

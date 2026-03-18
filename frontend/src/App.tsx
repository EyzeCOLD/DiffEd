"use client";

import CodeEditor from "./codeEditor/CodeEditor";
import styles from "./App.module.css";

export default function App() {
	return (
		<div className={styles.page}>
			Transcendence: It's a thing we're making™
			<CodeEditor />
		</div>
	);
}

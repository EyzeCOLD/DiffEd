"use client";

import {Link} from "react-router";
import styles from "./App.module.css";

export default function App() {
	return (
		<div className={styles.page}>
			Transcendence: It's a thing we're making™
			<div>
				<Link to="/edit/200">Code editor page</Link>
			</div>
			<div>
				<Link to="/filebrowser">File Browser</Link>
			</div>
		</div>
	);
}

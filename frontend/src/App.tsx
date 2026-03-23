"use client";

import {Link} from "react-router";
import styles from "./App.module.css";

export default function App() {
	return (
		<div className={styles.page}>
			Transcendence: It's a thing we're making™
			<Link to="/edit">Code editor page</Link>
		</div>
	);
}

"use client";

import {Link} from "react-router";

export default function App() {
	return (
		<div className="min-h-screen py-[1em]">
			Transcendence: It's a thing we're making™
			<div>
				<Link to="/filebrowser">File Browser</Link>
			</div>
		</div>
	);
}

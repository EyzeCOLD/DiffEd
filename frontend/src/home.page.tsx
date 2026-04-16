"use client";

import {Link} from "react-router";

export default function HomePage() {
	return (
		<div>
			Transcendence: It's a thing we're making™
			<div>
				<Link to="/filebrowser">File Browser</Link>
			</div>
		</div>
	);
}

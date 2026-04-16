import {Outlet} from "react-router";
import {PublicTopBar} from "./TopBars";

export default function PublicLayout() {
	return (
		<>
			<PublicTopBar />
			<main id="main">
				<Outlet />
			</main>
		</>
	);
}

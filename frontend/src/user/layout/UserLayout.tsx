import {Outlet, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import {getSession} from "../../utils";
import TopBar from "./TopBar";

export default function UserLayout() {
	const navigate = useNavigate();
	const [authed, setAuthed] = useState(false); /** @TODO replace useState with user store check */

	useEffect(() => {
		getSession().then((isLoggedIn) => {
			if (!isLoggedIn) navigate("/login", {replace: true});
			else setAuthed(true);
		});
	}, [navigate]);

	if (!authed) return null;

	return (
		<>
			<TopBar />
			<main id="main">
				<Outlet />
			</main>
		</>
	);
}

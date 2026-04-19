import {PublicTopBar} from "./TopBars";
import {Outlet, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import {getSession} from "../utils";
import {UserTopBar} from "./TopBars";

export function PublicLayout() {
	return (
		<>
			<PublicTopBar />
			<main id="main">
				<Outlet />
			</main>
		</>
	);
}

export function UserLayout() {
	const navigate = useNavigate();
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	useEffect(() => {
		getSession().then(setIsLoggedIn);
	}, []);

	useEffect(() => {
		getSession().then((isLoggedIn) => {
			if (!isLoggedIn) navigate("/login", {replace: true});
			else setIsLoggedIn(true);
		});
	}, []);

	if (!isLoggedIn) return <p>Loading...</p>;

	return (
		<>
			<UserTopBar />
			<main id="main">
				<Outlet />
			</main>
		</>
	);
}

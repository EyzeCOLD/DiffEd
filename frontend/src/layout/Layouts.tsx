import {PublicTopBar, UserTopBar} from "./TopBars";
import {Outlet, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import {getSession, apiFetch} from "../utils";
import {useCurrentUser, useSetUser, useClearUser} from "../stores/userStore";
import type {User} from "#shared/src/types.js";

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
	const storeUser = useCurrentUser();
	const setUser = useSetUser();
	const clearUser = useClearUser();
	const [ready, setReady] = useState(!!storeUser);

	useEffect(() => {
		if (storeUser) {
			// Detects expired sessions without blocking render
			getSession().then((ok) => {
				if (!ok) {
					clearUser();
					navigate("/login", {replace: true});
				}
			});
		} else {
			apiFetch<User>("/api/user", {method: "GET", credentials: "include"}).then((res) => {
				if (!res.ok) {
					navigate("/login", {replace: true});
				} else {
					setUser(res.data);
					setReady(true);
				}
			});
		}
	}, []);

	if (!ready) return <p>Loading...</p>;

	return (
		<>
			<UserTopBar />
			<main id="main">
				<Outlet />
			</main>
		</>
	);
}

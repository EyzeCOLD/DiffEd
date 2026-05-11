import {useNavigate} from "react-router";
import TopBarLink from "#/src/components/TopBarLink";
import {useShowToast} from "../stores/toastStore.ts";
import {useCurrentUser, useClearUser} from "../stores/userStore.ts";
import type {MouseEvent} from "react";
import Button from "#/src/components/Button";

function ContentSkipLink() {
	return (
		<>
			<a
				href="#main"
				className="sr-only text-foreground-light focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-accent focus:underline"
			>
				Skip to content
			</a>
		</>
	);
}

export function PublicTopBar() {
	const currentUser = useCurrentUser();

	return (
		<nav className="flex items-center justify-between bg-surface px-2 py-2">
			<ContentSkipLink />
			<TopBarLink to="/" end>
				Home
			</TopBarLink>
			<div className="flex gap-2">
				{currentUser ? <TopBarLink to="/dashboard">Dashboard</TopBarLink> : <TopBarLink to="/login">Log In</TopBarLink>}
			</div>
		</nav>
	);
}

export function UserTopBar() {
	const navigate = useNavigate();
	const showToast = useShowToast();
	const clearUser = useClearUser();

	async function logout(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		try {
			const response = await fetch("/api/session", {
				method: "DELETE",
				credentials: "include",
			});
			if (response.ok) {
				clearUser();
				navigate("/login");
			} else {
				const data = await response.json();
				showToast("error", data.error || "Logout failed");
			}
		} catch (e) {
			console.error("Logout error:", e);
			showToast("error", "Network error. Check your connection and try again.");
		}
	}

	return (
		<nav className="flex items-center justify-between bg-surface px-2 py-2">
			<ContentSkipLink />
			<div className="flex items-center gap-2">
				<TopBarLink to="/dashboard">Dashboard</TopBarLink>
				<TopBarLink to="/filebrowser">Files</TopBarLink>
			</div>
			<div className="flex items-center gap-2">
				<TopBarLink to="/account">Account</TopBarLink>
				<Button type="button" onClick={logout}>
					Logout
				</Button>
			</div>
		</nav>
	);
}

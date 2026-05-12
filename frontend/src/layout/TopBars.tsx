import {NavLink, useNavigate} from "react-router";
import {useShowToast} from "../stores/toastStore.ts";
import {useCurrentUser, useClearUser} from "../stores/userStore.ts";
import type {MouseEvent} from "react";

function navLinkClass({isActive}: {isActive: boolean}) {
	return `text-foreground px-3 py-2 hover:text-accent ${isActive ? "underline underline-offset-4 font-bold" : ""}`;
}

const contentSkipLink = (
	<a
		href="#main"
		className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-foreground focus:underline"
	>
		Skip to content
	</a>
);

export function PublicTopBar() {
	const currentUser = useCurrentUser();

	return (
		<nav className="flex items-center justify-between bg-surface px-2 py-2">
			{contentSkipLink}
			<NavLink to="/" end className={navLinkClass}>
				Home
			</NavLink>
			<div className="flex gap-2">
				{currentUser ? (
					<NavLink to="/filebrowser" className={navLinkClass}>
						Files
					</NavLink>
				) : (
					<NavLink to="/login" className={navLinkClass}>
						Log In
					</NavLink>
				)}
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
			{contentSkipLink}
			<div className="flex items-center gap-2">
				<NavLink to="/filebrowser" className={navLinkClass}>
					Files
				</NavLink>
			</div>
			<div className="flex items-center gap-2">
				<NavLink to="/account" className={navLinkClass}>
					Account
				</NavLink>
				<button type="button" className={`${navLinkClass({isActive: false})} cursor-pointer`} onClick={logout}>
					Logout
				</button>
			</div>
		</nav>
	);
}

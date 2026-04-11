import {Link, useNavigate} from "react-router";
import {Button} from "./Button";
import type {MouseEvent} from "react";

export default function TopBar() {
	const navigate = useNavigate();

	async function logout(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		try {
			const response = await fetch("api/session", {
				method: "DELETE",
				credentials: "include",
			});
			if (response.ok) {
				navigate("/login");
			} else {
				const data = await response.json();
				window.alert(data.error || "Logout failed");
			}
		} catch (e) {
			console.error("Logout error:", e);
			window.alert("Network error. Please try again.");
		}
	}

	return (
		<nav className="flex items-center justify-between bg-surface px-4 py-2">
			<div className="flex gap-4">
				<Link to="/dashboard" className="text-foreground hover:text-accent">
					Dashboard
				</Link>
				<Link to="/filebrowser" className="text-foreground hover:text-accent">
					Files
				</Link>
			</div>
			<Button type="button" onClick={logout}>
				Logout
			</Button>
		</nav>
	);
}

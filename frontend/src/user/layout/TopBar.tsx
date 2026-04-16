import {Link, useNavigate} from "react-router";
import {Button} from "../../components/Button";
import {useToastStore} from "../../components/toastStore.ts";
import type {MouseEvent} from "react";

export default function TopBar() {
	const navigate = useNavigate();
	const showToast = useToastStore((s) => s.showToast);

	async function logout(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		try {
			const response = await fetch("/api/session", {
				method: "DELETE",
				credentials: "include",
			});
			if (response.ok) {
				navigate("/login");
			} else {
				const data = await response.json();
				showToast("error", data.error || "Logout failed");
			}
		} catch (e) {
			console.error("Logout error:", e);
			showToast("error", "Network error. Please try again.");
		}
	}

	return (
		<nav className="flex items-center justify-between bg-surface px-4 py-2">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-foreground focus:underline"
			>
				Skip to content
			</a>
			<div className="flex gap-4">
				<Link to="/dashboard" className="text-foreground hover:text-accent">
					Dashboard
				</Link>
				<Link to="/filebrowser" className="text-foreground hover:text-accent">
					Files
				</Link>
				<Link to="/usermanagement" className="text-foreground hover:text-accent">
					User Management
				</Link>
			</div>
			<Button type="button" className="text-foreground hover:text-accent cursor-pointer" onClick={logout}>
				Logout
			</Button>
		</nav>
	);
}

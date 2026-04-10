import {useNavigate} from "react-router";
import type {MouseEvent} from "react";
import {getSession} from "../utils.ts";

export default function Dashboard() {
	const navigate = useNavigate();

	getSession().then((isLoggedIn) => {
		if (!isLoggedIn) {
			navigate("/login");
		}
	});

	async function logout(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();

		try {
			const response = await fetch("api/session", {
				method: "DELETE",
				credentials: "include",
			});
			if (response.ok) {
				console.log("logout successful");
				navigate("/login");
			} else {
				const data = await response.json();
				window.alert(data.error || "Logout failed");
			}
		} catch (e) {
			//TODO! Add the toast
			console.log("Logout error:", e);
			window.alert("Network error. Please try again.");
		}
	}

	return (
		<div>
			<div>Welcome to Dashboard!</div>
			<div>
				<button onClick={() => navigate("/usermanagement")} style={{background: "none", cursor: "pointer", padding: 0}}>
					user management
				</button>
			</div>
			<div>
				<button onClick={logout} style={{background: "none", cursor: "pointer", padding: 0}}>
					logout
				</button>
			</div>
		</div>
	);
}

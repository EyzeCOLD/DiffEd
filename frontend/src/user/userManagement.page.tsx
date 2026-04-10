import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
//import type {MouseEvent, SubmitEvent} from "react";

export default function UserManagementPage() {
	const [user, setUser] = useState("");
	const [email, setEmail] = useState("");

	const navigate = useNavigate();

	useEffect(() => {
		fetch("/api/user", {
			method: "GET",
			headers: {"Content-Type": "application/json"},
			credentials: "include",
		})
			.then((res) => {
				if (!res.ok) throw new Error("Error fetching user");
				return res.json();
			})
			.then((data) => {
				setUser(data.username);
				setEmail(data.email);
			})
			.catch((error) => {
				console.error(error);
				navigate("/dashboard");
			});
	}, [navigate]);

	async function changeMail() {}

	async function deleteAccount() {
		if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
			return;
		}
		try {
			const response = await fetch("/api/user", {
				method: "DELETE",
				//headers: {"Content-Type": "application/json"},
				credentials: "include",
			});

			if (!response.ok) {
				const msg = await response.json();
				window.alert(msg.error || "Failed to delete account");
			}

			console.log("Successfully deleted user");
			navigate("/login");
		} catch (e) {
			window.alert(e);
		}
	}

	return (
		<div>
			<div>User Management</div>
			<div>username: {user}</div>
			<div>
				email: {email}
				<button
					onClick={changeMail}
					style={{background: "none", cursor: "pointer", padding: 0}}
					aria-label="Change email address"
				>
					Change email address
				</button>
			</div>
			<div>
				<button
					onClick={deleteAccount}
					style={{background: "none", cursor: "pointer", padding: 0}}
					aria-label="Delete account"
				>
					Delete account
				</button>
			</div>
		</div>
	);
}

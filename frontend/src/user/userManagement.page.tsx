import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
//import type {MouseEvent, SubmitEvent} from "react";
import {z} from "zod";

const emailSchema = z.email();

type UpdateProps = {
	initialValue: string;
	onUpdate: (newValue: string) => void;
};

function Username({initialValue, onUpdate}: UpdateProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [newUsername, setNewUsername] = useState(initialValue);

	async function handleSubmitClick() {
		setIsLoading(true);
		try {
			if (!newUsername) {
				throw new Error("The field cannot be empty");
			}

			const response = await fetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({username: newUsername}),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Unexpected error");
			}

			onUpdate(newUsername);
		} catch (e) {
			console.log("Error updating username:", e);
			setNewUsername(initialValue);
			window.alert(e);
		} finally {
			setIsEditing(false);
			setIsLoading(false);
		}
	}

	function handleCancelClick() {
		setIsEditing(false);
		setNewUsername(initialValue);
	}

	return (
		<div>
			{isEditing ? (
				<div>
					<input placeholder="username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
					&nbsp;
					<button
						onClick={handleSubmitClick}
						disabled={isLoading}
						style={{cursor: "pointer"}}
						aria-label="Submit new username"
					>
						{isLoading ? "Saving..." : "Submit"}
					</button>
					&nbsp;
					<button onClick={handleCancelClick} style={{cursor: "pointer"}} aria-label="Cancel username change">
						Cancel
					</button>
				</div>
			) : (
				<div>
					<span>USERNAME: {initialValue}</span>
					&nbsp;
					<button onClick={() => setIsEditing(true)} style={{cursor: "pointer"}} aria-label="Change username">
						Change
					</button>
				</div>
			)}
		</div>
	);
}

function Email({initialValue, onUpdate}: UpdateProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [newEmail, setNewEmail] = useState(initialValue);

	async function handleSubmitClick() {
		setIsLoading(true);
		try {
			if (!newEmail) {
				throw new Error("The field cannot be empty");
			}

			const result = emailSchema.safeParse(newEmail);
			if (!result.success) {
				throw new Error("Invalid email");
			}

			const response = await fetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({email: newEmail}),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Unexpected error");
			}

			onUpdate(newEmail);
		} catch (e) {
			console.log("Error updating email:", e);
			setNewEmail(initialValue);
			window.alert(e);
		} finally {
			setIsEditing(false);
			setIsLoading(false);
		}
	}

	function handleCancelClick() {
		setIsEditing(false);
		setNewEmail(initialValue);
	}

	return (
		<div>
			{isEditing ? (
				<div>
					<input
						type="email"
						placeholder="example@email.com"
						value={newEmail}
						onChange={(e) => setNewEmail(e.target.value)}
					/>
					&nbsp;
					<button
						onClick={handleSubmitClick}
						disabled={isLoading}
						style={{cursor: "pointer"}}
						aria-label="Submit new email address"
					>
						{isLoading ? "Saving..." : "Submit"}
					</button>
					&nbsp;
					<button onClick={handleCancelClick} style={{cursor: "pointer"}} aria-label="Cancel email address change">
						Cancel
					</button>
				</div>
			) : (
				<div>
					<span>EMAIL: {initialValue}</span>
					&nbsp;
					<button onClick={() => setIsEditing(true)} style={{cursor: "pointer"}} aria-label="Change email address">
						Change
					</button>
				</div>
			)}
		</div>
	);
}

function Password() {
	const [isLoading, setIsLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [newPassword2, setNewPassword2] = useState("");
	const [oldPassword, setOldPassword] = useState("");

	async function handleSubmitClick() {
		setIsLoading(true);
		try {
			if (!oldPassword || !newPassword) {
				throw new Error("Please fill all the fields!");
			}

			if (newPassword !== newPassword2) {
				throw new Error("The passwords do not match!");
			}

			const response = await fetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({oldPassword, newPassword}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Unexpected error");
			}

			//TODO: Add toast "Password changed successfully"
			setNewPassword("");
			setNewPassword2("");
			setOldPassword("");
			setIsEditing(false);
		} catch (e) {
			console.log("Error updating password:", e);
			window.alert(e);
		} finally {
			setIsLoading(false);
		}
	}

	function handleCancelClick() {
		setIsEditing(false);
		setNewPassword("");
		setNewPassword2("");
		setOldPassword("");
	}

	return (
		<div>
			{isEditing ? (
				<div>
					<input placeholder="old password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
					<div>
						<input placeholder="new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
					</div>
					<div>
						<input
							placeholder="type new password again"
							value={newPassword2}
							onChange={(e) => setNewPassword2(e.target.value)}
						/>
					</div>
					<div>
						<button
							onClick={handleSubmitClick}
							disabled={isLoading}
							style={{cursor: "pointer"}}
							aria-label="Submit password change"
						>
							Submit
						</button>
						&nbsp;
						<button onClick={handleCancelClick} style={{cursor: "pointer"}} aria-label="Cancel password change">
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div>
					<button onClick={() => setIsEditing(true)} style={{cursor: "pointer"}} aria-label="Change password">
						Change Password
					</button>
				</div>
			)}
		</div>
	);
}

export default function UserManagementPage() {
	const [user, setUser] = useState("");
	const [email, setEmail] = useState("");
	//const [bio, setBio] = useState("");
	const [loading, setLoading] = useState(true);
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
				//setBio(data.bio);
				setLoading(false);
			})
			.catch((error) => {
				console.error(error);
				navigate("/dashboard");
			});
	}, [navigate]);

	function handleEmailUpdate(newEmail: string) {
		setEmail(newEmail);
	}

	function handleUsernameUpdate(newUsername: string) {
		setUser(newUsername);
	}

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

	return loading ? (
		<div>Loading...</div>
	) : (
		<div>
			<div>User Management</div>
			<div>
				<Username initialValue={user} onUpdate={handleUsernameUpdate} />
			</div>
			<div>
				<Email initialValue={email} onUpdate={handleEmailUpdate} />
			</div>
			<div>
				<Password />
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

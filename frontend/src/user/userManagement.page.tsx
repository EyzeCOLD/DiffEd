import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
import {z} from "zod";
import {Button} from "#/src/components/Button";
import {Input} from "#/src/components/Input";
import {useShowToast} from "#/src/components/toastStore.ts";

type UpdateProps = {
	initialValue: string;
	onUpdate: (newValue: string) => void;
};

function Username({initialValue, onUpdate}: UpdateProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [newUsername, setNewUsername] = useState(initialValue);
	const showToast = useShowToast();

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
			showToast("success", "Successfully changed username");
		} catch (e) {
			setNewUsername(initialValue);
			showToast("error", e instanceof Error ? e.message : String(e));
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
					<Input placeholder="username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
					&nbsp;
					<Button onClick={handleSubmitClick} disabled={isLoading} aria-label="Submit new username">
						{isLoading ? "Saving..." : "Submit"}
					</Button>
					&nbsp;
					<Button onClick={handleCancelClick} aria-label="Cancel username change">
						Cancel
					</Button>
				</div>
			) : (
				<div>
					<span>USERNAME: {initialValue}</span>
					&nbsp;
					<Button onClick={() => setIsEditing(true)} aria-label="Change username">
						Change
					</Button>
				</div>
			)}
		</div>
	);
}

function Email({initialValue, onUpdate}: UpdateProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [newEmail, setNewEmail] = useState(initialValue);
	const showToast = useShowToast();

	async function handleSubmitClick() {
		setIsLoading(true);
		try {
			if (!newEmail) {
				throw new Error("The field cannot be empty");
			}

			const result = z.email().safeParse(newEmail);
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
			showToast("success", "Successfully changed email");
		} catch (e) {
			setNewEmail(initialValue);
			showToast("error", e instanceof Error ? e.message : String(e));
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
					<Input
						type="email"
						placeholder="example@email.com"
						value={newEmail}
						onChange={(e) => setNewEmail(e.target.value)}
					/>
					&nbsp;
					<Button onClick={handleSubmitClick} disabled={isLoading} aria-label="Submit new email address">
						{isLoading ? "Saving..." : "Submit"}
					</Button>
					&nbsp;
					<Button onClick={handleCancelClick} aria-label="Cancel email address change">
						Cancel
					</Button>
				</div>
			) : (
				<div>
					<span>EMAIL: {initialValue}</span>
					&nbsp;
					<Button onClick={() => setIsEditing(true)} aria-label="Change email address">
						Change
					</Button>
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
	const showToast = useShowToast();

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

			setNewPassword("");
			setNewPassword2("");
			setOldPassword("");
			setIsEditing(false);
			showToast("success", "Successfully changed password");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
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
					<Input
						placeholder="old password"
						type="password"
						value={oldPassword}
						onChange={(e) => setOldPassword(e.target.value)}
					/>
					<div>
						<Input
							placeholder="new password"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
						/>
					</div>
					<div>
						<Input
							placeholder="type new password again"
							type="password"
							value={newPassword2}
							onChange={(e) => setNewPassword2(e.target.value)}
						/>
					</div>
					<div>
						<Button onClick={handleSubmitClick} disabled={isLoading} aria-label="Submit password change">
							Submit
						</Button>
						&nbsp;
						<Button onClick={handleCancelClick} aria-label="Cancel password change">
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<div>
					<Button onClick={() => setIsEditing(true)} aria-label="Change password">
						Change Password
					</Button>
				</div>
			)}
		</div>
	);
}

function Delete() {
	const navigate = useNavigate();
	const showToast = useShowToast();

	async function deleteAccount() {
		if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
			return;
		}
		try {
			const response = await fetch("/api/user", {
				method: "DELETE",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
			});

			if (!response.ok) {
				const msg = await response.json();
				window.alert(msg.error || "Failed to delete account");
			}

			showToast("success", "Successfully deleted user");
			navigate("/login");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div>
			<Button onClick={deleteAccount} aria-label="Delete account">
				Delete account
			</Button>
		</div>
	);
}

export default function UserManagementPage() {
	const [user, setUser] = useState("");
	const [email, setEmail] = useState("");
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
				<Delete />
			</div>
		</div>
	);
}

import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
import {z} from "zod";
import Button from "#/src/components/Button";
import Input from "#/src/components/Input";
import {useShowToast} from "#/src/stores/toastStore";
import {useCurrentUser, useSetUser, useUpdateUser} from "#/src/stores/userStore";
import {apiFetch} from "#/src/utils.js";
import type {ApiResponse, User} from "#shared/src/types.js";

const emailSchema = z.email();

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

			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({username: newUsername}),
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			onUpdate(newUsername);
			showToast("success", "Successfully changed username");
		} catch (e: unknown) {
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
					<Button
						onClick={handleSubmitClick}
						disabled={isLoading}
						style={{cursor: "pointer"}}
						aria-label="Submit new username"
					>
						{isLoading ? "Saving..." : "Submit"}
					</Button>
					&nbsp;
					<Button onClick={handleCancelClick} style={{cursor: "pointer"}} aria-label="Cancel username change">
						Cancel
					</Button>
				</div>
			) : (
				<div>
					<span>USERNAME: {initialValue}</span>
					&nbsp;
					<Button onClick={() => setIsEditing(true)} style={{cursor: "pointer"}} aria-label="Change username">
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

			if (!emailSchema.safeParse(newEmail).success) {
				throw new Error("Invalid email");
			}

			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({email: newEmail}),
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			onUpdate(newEmail);
			showToast("success", "Successfully changed email");
		} catch (e: unknown) {
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
					<Button
						onClick={handleSubmitClick}
						disabled={isLoading}
						style={{cursor: "pointer"}}
						aria-label="Submit new email address"
					>
						{isLoading ? "Saving..." : "Submit"}
					</Button>
					&nbsp;
					<Button onClick={handleCancelClick} style={{cursor: "pointer"}} aria-label="Cancel email address change">
						Cancel
					</Button>
				</div>
			) : (
				<div>
					<span>EMAIL: {initialValue}</span>
					&nbsp;
					<Button onClick={() => setIsEditing(true)} style={{cursor: "pointer"}} aria-label="Change email address">
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

			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({oldPassword, newPassword}),
			});

			if (!response.ok) {
				throw new Error(response.error);
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
							placeholder="new password, again"
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

function GithubLink({githubLinked}: {githubLinked: boolean}) {
	const [isLoading, setIsLoading] = useState(false);
	const updateUser = useUpdateUser();
	const showToast = useShowToast();

	async function handleUnlink() {
		setIsLoading(true);
		try {
			const response: ApiResponse<null> = await apiFetch("/api/auth/github/link", {
				method: "DELETE",
				credentials: "include",
			});
			if (!response.ok) throw new Error(response.error);
			updateUser({github_linked: false});
			showToast("success", "GitHub account unlinked");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		} finally {
			setIsLoading(false);
		}
	}

	if (githubLinked) {
		return (
			<div>
				<span>GitHub: Linked</span>
				&nbsp;
				<Button onClick={handleUnlink} disabled={isLoading} aria-label="Unlink GitHub account">
					{isLoading ? "Unlinking..." : "Unlink"}
				</Button>
			</div>
		);
	}

	return (
		<div>
			<a href="/api/auth/github?action=link_account">
				<Button type="button" aria-label="Link GitHub account">
					Link GitHub
				</Button>
			</a>
		</div>
	);
}

function VimBindings({enabled}: {enabled: boolean}) {
	const [isLoading, setIsLoading] = useState(false);
	const updateUser = useUpdateUser();
	const showToast = useShowToast();

	async function handleToggle() {
		setIsLoading(true);
		try {
			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({vim_bindings: !enabled}),
			});
			if (!response.ok) throw new Error(response.error);
			updateUser({vim_bindings: !enabled});
			showToast("success", `Vim bindings ${!enabled ? "enabled" : "disabled"}`);
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
		setIsLoading(false);
	}

	return (
		<div>
			<span>VIM BY DEFAULT:</span>
			<Button onClick={handleToggle} disabled={isLoading} aria-label="Toggle vim bindings">
				{enabled ? "On" : "Off"}
			</Button>
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
			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "DELETE",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to delete account");
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
				Delete Account
			</Button>
		</div>
	);
}

export default function UserManagementPage() {
	const currentUser = useCurrentUser();
	const setUser = useSetUser();
	const updateUser = useUpdateUser();
	const [loading, setLoading] = useState(!currentUser);
	const showToast = useShowToast();
	const navigate = useNavigate();

	useEffect(() => {
		if (currentUser) return;

		apiFetch<User>("/api/user", {method: "GET", credentials: "include"}).then((response) => {
			if (!response.ok) {
				showToast("error", `Error fetching user data: ${response.error}`);
				return;
			}
			setUser(response.data);
			setLoading(false);
		});
	}, [navigate]);

	return loading || !currentUser ? (
		<div>Loading...</div>
	) : (
		<div>
			<div>User Management</div>
			<div>
				<Username initialValue={currentUser.username} onUpdate={(username) => updateUser({username})} />
			</div>
			<div>
				<Email initialValue={currentUser.email} onUpdate={(email) => updateUser({email})} />
			</div>
			<div>
				<Password />
			</div>
			<div>
				<GithubLink githubLinked={!!currentUser.github_linked} />
			</div>
			<div>
				<VimBindings enabled={currentUser.vim_bindings} />
			</div>
			<div>
				<Delete />
			</div>
		</div>
	);
}

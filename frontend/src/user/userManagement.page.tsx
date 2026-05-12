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

type UserSettingProps = {
	user: User;
	onUpdate: (username?: string, email?: string) => void;
};

function UserSettings({user, onUpdate}: UserSettingProps) {
	const [currentUsername, setCurrentUsername] = useState(user.username);
	const [currentEmail, setCurrentEmail] = useState(user.email);
	const [newUsername, setNewUsername] = useState("");
	const [newEmail, setNewEmail] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState(false);
	const showToast = useShowToast();

	useEffect(() => {
		if (!newUsername && !newEmail) setPasswordConfirm(false);
		else setPasswordConfirm(true);
	}, [newUsername, newEmail]);

	async function resetState() {
		setNewUsername("");
		setNewEmail("");
		setPasswordConfirm(false);
	}

	function isValidInput() {
		const errors: string[] = [];

		if (newUsername) {
			if (newUsername.length < 3) errors.push("Username has to be at least 3 characters long");
			if (newUsername === currentUsername) errors.push("New Username same as current username");
		}
		if (newEmail) {
			if (!emailSchema.safeParse(newEmail).success) errors.push("Invalid email");
			if (newEmail == currentEmail) errors.push("error", "New email same as current email");
		}

		if (errors.length > 0) {
			errors.forEach((error) => showToast("error", error));
			return false;
		}
		return true;
	}

	async function handleConfirmClick(password: string) {
		if (!isValidInput()) return;

		try {
			if (newUsername) {
				const response: ApiResponse<null> = await apiFetch("/api/user", {
					method: "PATCH",
					headers: {"Content-Type": "application/json"},
					credentials: "include",
					body: JSON.stringify({username: newUsername, password: password}),
				});

				if (!response.ok) {
					if (response.error.includes("password")) throw new Error(response.error);
					showToast("error", response.error);
				} else {
					setCurrentUsername(newUsername);
					showToast("success", "Successfully updated username");
				}
			}

			if (newEmail) {
				const response: ApiResponse<null> = await apiFetch("/api/user", {
					method: "PATCH",
					headers: {"Content-Type": "application/json"},
					credentials: "include",
					body: JSON.stringify({email: newEmail, password: password}),
				});

				if (!response.ok) {
					if (response.error.includes("password")) throw new Error(response.error);
					showToast("error", response.error);
				} else {
					setCurrentEmail(newEmail);
					showToast("success", "Successfully updated email");
				}
			}

			onUpdate(currentUsername, currentEmail);
			resetState();
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<>
			<div>
				<h2>Username</h2>
				<div>
					<Input
						type="text"
						placeholder={currentUsername}
						value={newUsername}
						onChange={(e) => setNewUsername(e.target.value)}
					/>
				</div>
				<h2>Email</h2>
				<div>
					<Input
						type="email"
						placeholder={currentEmail}
						value={newEmail}
						onChange={(e) => setNewEmail(e.target.value)}
					/>
				</div>
			</div>
			<div>
				{passwordConfirm ? (
					<div>
						<Confirm
							onConfirm={handleConfirmClick}
							onCancel={() => {
								setPasswordConfirm(false);
								resetState();
							}}
						/>
					</div>
				) : (
					<div></div>
				)}
			</div>
		</>
	);
}

function Password() {
	const [passwordConfirm, setPasswordConfirm] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [newPassword2, setNewPassword2] = useState("");
	const showToast = useShowToast();

	useEffect(() => {
		if (!newPassword && !newPassword2) setPasswordConfirm(false);
		else setPasswordConfirm(true);
	}, [newPassword, newPassword2]);

	function resetState() {
		setIsEditing(false);
		setPasswordConfirm(false);
		setNewPassword("");
		setNewPassword2("");
	}

	async function handleConfirmClick(password: string) {
		if (!newPassword || !newPassword2) {
			return showToast("error", "Please fill all the fields!");
		}

		if (newPassword !== newPassword2) {
			return showToast("error", "The passwords do not match!");
		}

		try {
			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({password, newPassword, newPassword2}),
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			showToast("success", "Successfully changed password");
			resetState();
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div>
			{isEditing ? (
				<>
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
						{passwordConfirm ? (
							<div>
								<Confirm
									onConfirm={handleConfirmClick}
									onCancel={() => {
										setPasswordConfirm(false);
										resetState();
									}}
								/>
							</div>
						) : (
							<div></div>
						)}
					</div>
				</>
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
	const [passwordConfirm, setPasswordConfirm] = useState(false);
	const navigate = useNavigate();
	const showToast = useShowToast();

	async function deleteAccount(password: string) {
		if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
			return;
		}

		try {
			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "DELETE",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({password: password}),
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			showToast("success", "Successfully deleted user");
			navigate("/login");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	return !passwordConfirm ? (
		<div>
			<Button onClick={() => setPasswordConfirm(true)} aria-label="Delete account">
				Delete Account
			</Button>
		</div>
	) : (
		<div>
			<h2>You are deleting your account!</h2>
			<Confirm onConfirm={deleteAccount} onCancel={() => setPasswordConfirm(false)} />
		</div>
	);
}

type PasswordConfirmProps = {
	onConfirm: (password: string) => void;
	onCancel: () => void;
};

function Confirm({onConfirm, onCancel}: PasswordConfirmProps) {
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const showToast = useShowToast();

	async function handleSubmitClick() {
		setIsLoading(true);
		try {
			if (!password) {
				throw new Error("Please fill the password!");
			}

			onConfirm(password);
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			<div>
				<Input
					placeholder="Enter password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<Button onClick={handleSubmitClick} disabled={isLoading} aria-label="Accept profile updates">
					Confirm
				</Button>
			</div>
			<div>
				Please enter password to accept the changes or&nbsp;
				<button
					onClick={onCancel}
					className="hover:text-accent font-bold underline cursor-pointer"
					aria-label="Cancel profile updates"
				>
					cancel
				</button>
			</div>
		</>
	);
}

function APIKey() {
	const [isLoading, setIsLoading] = useState(false);
	const showToast = useShowToast();

	// Make this work so that the Copy button is not visible until user has a valid API key
	async function copyAPIKey() {
		try {
			setIsLoading(true);
			const response: ApiResponse<string> = await apiFetch("/api/user/api", {
				method: "GET",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			const key = response.data;
			await navigator.clipboard.writeText(key);
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		} finally {
			setIsLoading(false);
		}
	}

	async function createNewAPIKey() {
		try {
			setIsLoading(true);

			const hash = window.crypto.randomUUID();
			console.log(hash);
			const response: ApiResponse<string> = await apiFetch("/api/user/api", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({hash}),
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			const key = response.data;
			await navigator.clipboard.writeText(key);
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			<div>
				<Button onClick={copyAPIKey} disabled={isLoading} aria-label="Get current API key">
					Copy API key
				</Button>
			</div>
			<div>
				<Button onClick={createNewAPIKey} disabled={isLoading} aria-label="Create new API key">
					Create new API key
				</Button>
			</div>
		</>
	);
}

export default function UserManagementPage() {
	const currentUser = useCurrentUser();
	const setUser = useSetUser();
	const updateUser = useUpdateUser();
	const [isLoading, setIsLoading] = useState(!currentUser);
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
			setIsLoading(false);
		});
	}, [navigate]);

	return isLoading || !currentUser ? (
		<div>Loading...</div>
	) : (
		<div>
			<h1>Account Settings</h1>
			<div>
				<UserSettings user={currentUser} onUpdate={(username, email) => updateUser({username, email})} />
			</div>
			<div>
				<Password />
			</div>
			<div>
				<GithubLink githubLinked={!!currentUser.github_linked} />
			</div>
			<div>
				<APIKey />
			</div>
			<div>
				<VimBindings enabled={currentUser.vim_bindings} />
			</div>
			<div>
				DANGER ZONE!!!
				<Delete />
			</div>
		</div>
	);
}

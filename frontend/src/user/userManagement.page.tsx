import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
import {z} from "zod";
import {Button} from "#/src/components/Button";
import {Input} from "#/src/components/Input";
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

	async function resetState() {
		setNewUsername("");
		setNewEmail("");
		setPasswordConfirm(false);
	}

	function handleSubmitClick() {
		if (!newUsername && !newEmail) return showToast("error", "No changes available");
		if (newEmail) {
			if (!emailSchema.safeParse(newEmail).success)
				return showToast("error", "Invalid email. If you don't want to change email, please leave the field empty.");
			if (newEmail == currentEmail) return showToast("error", "New email same as current email");
		}

		if (newUsername) {
			if (newUsername.length < 3) return showToast("error", "Username has to be at least 3 characters long");
			if (newUsername === currentUsername) return showToast("error", "New Username same as current username");
		}

		setPasswordConfirm(true);
	}

	async function handleAcceptClick(password: string) {
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
						disabled={passwordConfirm}
						placeholder={currentUsername}
						value={newUsername}
						onChange={(e) => setNewUsername(e.target.value)}
					/>
				</div>
				<h2>Email</h2>
				<div>
					<Input
						type="email"
						disabled={passwordConfirm}
						placeholder={currentEmail}
						value={newEmail}
						onChange={(e) => setNewEmail(e.target.value)}
					/>
				</div>
			</div>
			<div>
				{passwordConfirm ? (
					<div>
						<Confirm onConfirm={handleAcceptClick} onCancel={() => setPasswordConfirm(false)} />
					</div>
				) : (
					<div>
						<Button onClick={handleSubmitClick} aria-label="Update Profile">
							Submit Changes
						</Button>
					</div>
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

	function resetState() {
		setIsEditing(false);
		setPasswordConfirm(false);
		setNewPassword("");
		setNewPassword2("");
	}

	async function handleAcceptClick(password: string) {
		try {
			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "PATCH",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({password, newPassword}),
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

	function handleSubmitClick() {
		if (!newPassword || !newPassword2) {
			return showToast("error", "Please fill all the fields!");
		}

		if (newPassword !== newPassword2) {
			return showToast("error", "The passwords do not match!");
		}

		setPasswordConfirm(true);
	}

	return (
		<div>
			{isEditing ? (
				<>
					<div>
						<Input
							placeholder="new password"
							disabled={passwordConfirm}
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
						/>
					</div>
					<div>
						<Input
							placeholder="new password, again"
							disabled={passwordConfirm}
							type="password"
							value={newPassword2}
							onChange={(e) => setNewPassword2(e.target.value)}
						/>
					</div>
					<div>
						{!passwordConfirm ? (
							<div>
								<Button onClick={handleSubmitClick} aria-label="Submit password change">
									Submit
								</Button>
								<Button onClick={resetState} aria-label="Cancel password change">
									Cancel
								</Button>
							</div>
						) : (
							<div>
								<Confirm onConfirm={handleAcceptClick} onCancel={resetState} />
							</div>
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
					Accept
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
				DANGER ZONE!!!
				<Delete />
			</div>
		</div>
	);
}

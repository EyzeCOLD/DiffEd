import Button from "#/src/components/Button";
import Input from "#/src/components/Input";
import {useState, useEffect} from "react";
import {useNavigate, useSearchParams} from "react-router";
import type {SubmitEvent} from "react";
import type {SigningUser, ApiResponse, User, PendingGithubPayload} from "#shared/src/types";
import {apiFetch, getSession} from "#/src/utils.ts";
import {z} from "zod";
import {useShowToast} from "#/src/stores/toastStore";
import {useSetUser} from "#/src/stores/userStore.ts";

const emailSchema = z.email();

function decodeGithubToken(token: string): PendingGithubPayload | null {
	try {
		// Token format: "<base64url-payload>.<hmac-sig>" — strip the signature, convert base64url to base64, decode
		// `replace` operations because base64url uses - and _ instead of + and / (RFC 4648 §5): atob needs standard base64, so swap them back
		// e.g. "eyJnaXRodWJJZCI6....<sig>" to { githubId: "...", email: "...", ... }
		const data = token.slice(0, token.lastIndexOf("."));
		return JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
	} catch {
		return null;
	}
}

export default function SignupPage() {
	const [username, setUserName] = useState("");
	const [email, setUserEmail] = useState("");
	const [password, setUserPassword] = useState("");
	const [password2, setUserPassword2] = useState("");
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const showToast = useShowToast();
	const setUser = useSetUser();

	const githubToken = searchParams.get("github_token");
	const pendingGithub = githubToken ? decodeGithubToken(githubToken) : null;

	useEffect(() => {
		getSession().then((ok) => {
			if (ok) navigate("/filebrowser");
		});
		if (pendingGithub) {
			setUserName(pendingGithub.displayName.slice(0, 20).replace(/[^a-zA-Z0-9_]/g, "_"));
		}
	}, [navigate]);

	async function signup(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			if (!username || !email || !password) {
				throw new Error("Please fill all the fields!");
			}

			const result = emailSchema.safeParse(email);
			if (!result.success) {
				throw new Error("Invalid email");
			}

			if (password !== password2) {
				throw new Error("The passwords do not match!");
			}

			const newUser: SigningUser = {
				username: username,
				email: email,
				password: password,
			};

			const response: ApiResponse<null> = await apiFetch("/api/user", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify(newUser),
			});

			if (!response.ok) {
				throw new Error(response.error);
			}

			showToast("success", "Signup successful");
			navigate("/login");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	async function completeGithubSignup(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			if (!username) throw new Error("Please enter a username");

			const response: ApiResponse<User> = await apiFetch("/api/auth/github/username", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({token: githubToken, username}),
			});

			if (!response.ok) throw new Error(response.error);

			setUser(response.data);
			showToast("success", "Account created");
			navigate("/filebrowser");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	// TODO: should we use maxlength for the input fields?

	if (pendingGithub) {
		return (
			<div>
				<div>Complete your GitHub sign-up</div>
				<form onSubmit={completeGithubSignup}>
					<div>
						<Input placeholder="username" value={username} onChange={(e) => setUserName(e.target.value)} />
					</div>
					<div>
						<Button type="submit">Create Account</Button>
					</div>
				</form>
			</div>
		);
	}

	return (
		<div>
			<div>Welcome to the signup page</div>
			<form onSubmit={signup}>
				<div>
					<Input placeholder="username" value={username} onChange={(e) => setUserName(e.target.value)} />
				</div>
				<div>
					<Input placeholder="email" value={email} onChange={(e) => setUserEmail(e.target.value)} />
				</div>
				<div>
					<Input
						placeholder="password"
						type="password"
						value={password}
						onChange={(e) => setUserPassword(e.target.value)}
					/>
				</div>
				<div>
					<Input
						placeholder="repeat password"
						type="password"
						value={password2}
						onChange={(e) => setUserPassword2(e.target.value)}
					/>
				</div>
				<div>
					<Button type="submit">Sign Up</Button>
				</div>
			</form>
			<div>
				<a href="/api/auth/github?action=signup">
					<Button type="button">Sign up with GitHub</Button>
				</a>
			</div>
			<div>
				Already have an account? Go to&nbsp;
				<button onClick={() => navigate("/login")} className="hover:text-accent font-bold underline cursor-pointer">
					login page
				</button>
			</div>
		</div>
	);
}

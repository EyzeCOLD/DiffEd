import Button from "../components/Button";
import Input from "../components/Input";
import {useState, useEffect} from "react";
import type {SubmitEvent} from "react";
import {useNavigate, useSearchParams} from "react-router";
import {getSession, apiFetch} from "#/src/utils.ts";
import {useShowToast} from "#/src/stores/toastStore";
import {useSetUser} from "#/src/stores/userStore.ts";
import type {ApiResponse, User} from "#shared/src/types.js";

export default function LoginPage() {
	const [loginIdentifier, setLoginIdentifier] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const navigate = useNavigate();
	const showToast = useShowToast();
	const setUser = useSetUser();
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const githubExists = searchParams.get("github_exists");
		if (githubExists) showToast("error", `${githubExists} already has a registered GitHub account`);
		const githubError = searchParams.get("github_error");
		if (githubError === "no_account") showToast("error", "No account linked to your GitHub profile");
		if (githubError === "email_exists") showToast("error", "An account with this email already exists");
		getSession().then((ok) => {
			if (ok) navigate("/dashboard");
		});
	}, [navigate]);

	async function login(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!loginIdentifier || !loginPassword) {
			return showToast("error", "Please fill all the fields.");
		}

		const response: ApiResponse<User> = await apiFetch("/api/session", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			credentials: "include",
			body: JSON.stringify({loginIdentifier, password: loginPassword}),
		});
		if (!response.ok) {
			return showToast("error", `Login failed. ${response.error}`);
		}
		setUser(response.data);
		showToast("success", "Login successful");
		navigate("/dashboard");
	}

	//should we use maxlength for the input fields?
	return (
		<div>
			<div>Welcome to the login page</div>
			<form onSubmit={login}>
				<div>
					<Input
						placeholder="username or email"
						value={loginIdentifier}
						onChange={(e) => setLoginIdentifier(e.target.value)}
					/>
				</div>
				<div>
					<Input
						placeholder="password"
						type="password"
						value={loginPassword}
						onChange={(e) => setLoginPassword(e.target.value)}
					/>
				</div>
				<div>
					<Button type="submit">Log In</Button>
				</div>
			</form>
			<div>
				<a href="/api/auth/github">
					<Button type="button">Login with GitHub</Button>
				</a>
			</div>
			<div>
				Don't have an account? Create one&nbsp;
				<button onClick={() => navigate("/signup")} className="hover:text-accent font-bold underline cursor-pointer">
					here
				</button>
			</div>
		</div>
	);
}

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
			if (ok) navigate("/filebrowser");
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
		navigate("/filebrowser");
	}

	return (
		<div className="flex flex-col items-center justify-center pt-12 gap-2">
			<form onSubmit={login} className="grid grid-cols-[auto_1fr] items-center gap-y-2 gap-x-2 w-fit">
				<label htmlFor="login" className="text-right">
					Login
				</label>
				<Input
					id="login"
					placeholder="username or email"
					value={loginIdentifier}
					onChange={(e) => setLoginIdentifier(e.target.value)}
				/>
				<label htmlFor="password" className="text-right">
					Password
				</label>
				<Input
					id="password"
					placeholder="********"
					type="password"
					value={loginPassword}
					onChange={(e) => setLoginPassword(e.target.value)}
				/>
				<Button type="submit" className="col-span-2 mx-auto">
					Log In
				</Button>
			</form>

			<a href="/api/auth/github">
				<Button type="button">Login with GitHub</Button>
			</a>

			<div className="flex flex-col items-center">
				<p className="text-sm">Don't have an account?</p>
				<Button onClick={() => navigate("/signup")}>Sign Up</Button>
			</div>
		</div>
	);
}

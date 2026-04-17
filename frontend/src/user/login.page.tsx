import {Button} from "../components/Button";
import {Input} from "../components/Input";
import {useState, useEffect} from "react";
import type {SubmitEvent} from "react";
import {useNavigate} from "react-router";
import {getSession} from "../utils.ts";
import {useShowToast} from "../layout/toastStore.ts";

export default function LoginPage() {
	const [loginIdentifier, setLoginIdentifier] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const navigate = useNavigate();
	const showToast = useShowToast();

	useEffect(() => {
		getSession().then((isLoggedIn) => {
			if (isLoggedIn) {
				navigate("/dashboard");
			}
		});
	}, [navigate]);

	async function login(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			if (!loginIdentifier || !loginPassword) {
				throw new Error("Please fill all the fields!");
			}

			const response = await fetch("/api/session", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify({loginIdentifier, password: loginPassword}),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Login failed");
			}
			showToast("success", "Login successful");
			navigate("/dashboard");
		} catch (e) {
			showToast("error", `Login failed. ${e instanceof Error ? e.message : String(e)}`);
		}
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
					<Button type="submit">login</Button>
				</div>
			</form>
			<div>
				<button
					//TODO! Link to forgot password page
					onClick={() => navigate("/signup")}
					className="font-bold underline cursor-pointer"
				>
					Forgot Password?
				</button>
			</div>
			<div>
				Don't have an account? Create one&nbsp;
				<button onClick={() => navigate("/signup")} className="font-bold underline cursor-pointer">
					here
				</button>
			</div>
		</div>
	);
}

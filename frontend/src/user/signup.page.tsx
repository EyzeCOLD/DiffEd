import {Button} from "../components/Button";
import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
import type {SubmitEvent} from "react";
import type {SigningUser} from "#shared/src/types";
import {getSession} from "../utils.ts";
import {z} from "zod";
import {useToastStore} from "../components/toastStore.ts";

const emailSchema = z.email();

export default function SignupPage() {
	const [username, setUserName] = useState("");
	const [email, setUserEmail] = useState("");
	const [password, setUserPassword] = useState("");
	const [password2, setUserPassword2] = useState("");
	const navigate = useNavigate();
	const showToast = useToastStore((s) => s.showToast);

	useEffect(() => {
		getSession().then((isLoggedIn) => {
			if (isLoggedIn) {
				navigate("/dashboard");
			}
		});
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

			const response = await fetch("/api/user", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				credentials: "include",
				body: JSON.stringify(newUser),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error);
			}
			showToast("success", "Signup successful");
			navigate("/login");
		} catch (e) {
			showToast("error", e instanceof Error ? e.message : String(e));
		}
	}

	// TODO: should we use maxlength for the input fields?
	return (
		<div>
			<div>Welcome to the signup page</div>
			<form onSubmit={signup}>
				<div>
					<input
						placeholder="username"
						className="m-1"
						value={username}
						onChange={(e) => setUserName(e.target.value)}
					/>
				</div>
				<div>
					<input placeholder="email" className="m-1" value={email} onChange={(e) => setUserEmail(e.target.value)} />
				</div>
				<div>
					<input
						placeholder="password"
						className="m-1"
						value={password}
						onChange={(e) => setUserPassword(e.target.value)}
					/>
				</div>
				<div>
					<input
						placeholder="repeat password"
						className="m-1"
						value={password2}
						onChange={(e) => setUserPassword2(e.target.value)}
					/>
				</div>
				<div>
					<Button type="submit">signup</Button>
				</div>
			</form>
			<div>
				Already have an account? Go to&nbsp;
				<button onClick={() => navigate("/login")} className="font-bold underline cursor-pointer">
					login page
				</button>
			</div>
		</div>
	);
}

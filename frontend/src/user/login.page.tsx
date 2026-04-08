import {useState} from "react";
import type {SubmitEvent} from "react";
import {useNavigate} from "react-router";
import {getSession} from "../utils.ts";

export default function LoginPage() {
	const [loginIdentifier, setLoginIdentifier] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const navigate = useNavigate();

	getSession().then((isLoggedIn) => {
		if (isLoggedIn) {
			navigate("/dashboard");
		}
	});

	const login = async (event: SubmitEvent<HTMLFormElement>) => {
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
				const msg = await response.text();
				throw new Error(msg);
			}
			console.log("login successful");
			navigate("/dashboard");
		} catch (e) {
			// TODO! Add the toast
			window.alert(`Login failed: ${e}`);
		}
	};

	//should we use maxlength for the input fields?
	return (
		<div>
			<div>Welcome to the login page</div>
			<form onSubmit={login}>
				<div>
					<input
						placeholder="username or email"
						value={loginIdentifier}
						onChange={(e) => setLoginIdentifier(e.target.value)}
					/>
				</div>
				<div>
					<input placeholder="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
				</div>
				<div>
					<button type="submit">login</button>
				</div>
			</form>
			<div>
				<button
					//TODO! Link to forgot password page
					onClick={() => navigate("/signup")}
					style={{background: "none", border: "none", cursor: "pointer", padding: 0}}
				>
					Forgot Password?
				</button>
			</div>
			<div>
				Don't have an account? Create one&nbsp;
				<button
					onClick={() => navigate("/signup")}
					style={{background: "none", border: "none", cursor: "pointer", padding: 0}}
				>
					here
				</button>
			</div>
		</div>
	);
}

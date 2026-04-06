import styles from "./Login.page.module.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type {SubmitEvent} from "react";
import type {SigningUser} from "#shared/src/types";
import useAuthCheck from "../components/auth.tsx";
import { z } from "zod";

const emailSchema = z.email();

export default function SignupPage() {

    const [username, setUserName] = useState("");
    const [email, setUserEmail] = useState("");
    const [password, setUserPassword] = useState("");
    const [password2, setUserPassword2] = useState("");
    const navigate = useNavigate();

    const { isLoading, isAuthenticated } = useAuthCheck();
    if (isAuthenticated) {
        navigate("/dashboard");
        return null;
    }

    const signup = async (event: SubmitEvent<HTMLButtonElement>) => {
        event.preventDefault();

        try {
            if (!username || !email || !password) {
                throw new Error("Please fill all the fields!");
            }

            const result = emailSchema.safeParse(email);
            if (!result.success) {
                throw new Error("Invalid email");
            }

            if (password != password2) {
                throw new Error("The passwords do not match!");
            }

            const newUser: SigningUser = {
                username: username,
                email: email,
                password: password,
            }

            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newUser),
            })
            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg);
            }
            console.log("Signup successful");
            navigate("/login");
        } catch (e) {
            // TODO! Add the toast
            window.alert(e);
        }
    };

    // TODO: should we use maxlength for the input fields?
    return (isLoading ? (
        <div>Loading...</div>
    ) : (
        <div className={styles.page}>
            <div>
                Welcome to the signup page
            </div>
            <form onSubmit={signup}>
                <div>
                    <input
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="email"
                        value={email}
                        onChange={(e) => setUserEmail(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="password"
                        value={password}
                        onChange={(e) => setUserPassword(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="repeat password"
                        value={password2}
                        onChange={(e) => setUserPassword2(e.target.value)} />
                </div>
                <div>
                    <button type="submit">login</button>
                </div>
            </form>
                <div>
                    Already have an account? Go to&nbsp; 
                    <button
                        className={styles.link}
                        onClick={() => navigate('/login')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        login page
                    </button>
                </div>
        </div>
    ))
}

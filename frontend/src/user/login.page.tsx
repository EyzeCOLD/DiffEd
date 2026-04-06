import styles from "./Login.page.module.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { SubmitEvent } from "react";
import useAuthCheck from "../components/auth.tsx";

export default function LoginPage() {

    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const navigate = useNavigate();

    const { isLoading, isAuthenticated } = useAuthCheck();
    if (isAuthenticated) {
        navigate("/dashboard");
        return null;
    }

    const login = async (event: SubmitEvent<HTMLButtonElement>) => {
        event.preventDefault();

        try {
            if (!loginIdentifier || !loginPassword) {
                throw new Error("Please fill all the fields!")
            }

            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ loginIdentifier, password: loginPassword }),
            })
            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg);
            }
            console.log("login successful");
            navigate("/dashboard");
        } catch (e) {
            // TODO! Add the toast
            window.alert(`Login failed: ${e.message}`);
        }
    };

    //should we use maxlength for the input fields?
    return (isLoading ? (
        <div>Loading...</div>
    ) : (
        <div className={styles.page}>
            <div>
                Welcome to the login page
            </div>
            <form onSubmit={login}>
                <div>
                    <input
                        placeholder="username or email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <div>
                    <button type="submit">login</button>
                </div>
            </form>
            <div>
                <button
                    className={styles.link}
                    //TODO! Link to forgot password page
                    onClick={() => navigate('/signup')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                    Forgot Password?
                </button>
            </div>
            <div>
                Don't have an account? Create one&nbsp; 
                <button
                    className={styles.link}
                    onClick={() => navigate('/signup')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                    here
                </button>
            </div>
        </div>
    ))
}


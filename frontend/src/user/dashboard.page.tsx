import styles from "./Login.page.module.css";
import { useNavigate } from "react-router";
import type { SubmitEvent } from "react";
import getSession from "../utils.ts"


export default function Dashboard() {
    const navigate = useNavigate();

    getSession().then((isLoggedIn) => {
        if (!isLoggedIn) {
            navigate("/login");
        }
    });

    const logout = async (event: SubmitEvent<HTMLButtonElement>) => {
        event.preventDefault();

        try {
            const response = await fetch("api/session", {
                method: "DELETE",
                credentials: "include",
            });
            if (response.ok) {
                console.log("logout successful");
                navigate("/login");
            } else {
                const data = await response.json();
                window.alert(data.error || "Logout failed");
            }
        } catch (e) {
            //TODO! Add the toast
            console.log("Logout error:", e);
            window.alert("Network error. Please try again.");
        }
    };

    return (
        <div className={styles.page}>
            <div>Welcome to Dashboard!</div>
            <div>
                <button
                    type="submit"
                    className={styles.link}
                    onClick={logout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                    logout 
                </button>
            </div>
        </div>
    );
}

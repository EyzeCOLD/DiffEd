import styles from "./Login.page.module.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import useAuthCheck from "../components/auth.tsx";

export default function Dashboard() {
    const navigate = useNavigate();

    const { isLoading, isAuthenticated } = useAuthCheck();
    if (isLoading) return <div>Loading...</div>;
    if (!isAuthenticated) {
        navigate("/login");
        return null;
    }

    const logout = async (event: SubmitEvent<HTMLButtonElement>) => {
        event.preventDefault();

        try {
            const response = await fetch("api/logout", {
                method: "POST",
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

    return (<div className={styles.page}>
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

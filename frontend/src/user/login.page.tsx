import styles from "./Login.page.module.css";
import { useState } from 'react';
import type { SubmitEvent } from 'react';
//import type {LoginUser} from "#shared/src/types";

export default function LoginPage() {

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [userPassword, setUserPassword] = useState('');

    const submit = async (event: SubmitEvent<HTMLButtonElement>) => {
        event.preventDefault();

        try {
            if (!loginIdentifier || !userPassword) {
                throw new Error("Please fill all the fields!")
            }

            const response = await fetch('/api/login', {
                method: 'POST',
                body: JSON.stringify({ loginIdentifier, password: userPassword }),
                headers: { "Content-Type": "application/json" },
            })
            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg);
            }
            console.log("login successful");
            //TODO! Redirect the user to main page
        } catch (e) {
            // TODO! Add the toast
            window.alert(`Login failed: ${e.message}`);
        }
    };

    //should we use maxlength for the input fields?
    return (
        <div className={styles.page}>
            <div>
                Welcome to the login page
            </div>
            <form onSubmit={submit}>
                <div>
                    <input
                        placeholder="username or email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)} />
                </div>
                <div>
                    <button type="submit">login</button>
                </div>
                <div>
                    <a className={styles.link} href="http://localhost:8080">
                        Forgot Password?
                    </a>
                </div>
                <div>
                    Don't have an account? Create one
                    <a className={styles.link} href="http://localhost:8080/signup">
                        here
                    </a>
                </div>
            </form>
        </div>
    )
}


import styles from "./Login.page.module.css";
import { useState } from 'react';
import type {SubmitEvent} from 'react';
import type {SigningUser} from "#shared/src/types";
import { z } from "zod";

const emailSchema = z.email();

export default function SignupPage() {

    const [username, setUserName] = useState('');
    const [email, setUserEmail] = useState('');
    const [password, setUserPassword] = useState('');
    const [password2, setUserPassword2] = useState('');

    const submit = async (event: SubmitEvent<HTMLFormElement>) => {
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
                throw new Error("The passwords don't match!");
            }

            const newUser: SigningUser = {
                username: username,
                email: email,
                password: password,
            }

            const response = await fetch('/api/signup', {
                method: 'POST',
                body: JSON.stringify(newUser),
                headers: { "Content-Type": "application/json" },
            })
            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg);
            }
            console.log("Signup successful");
            //TODO! Redirect and show message of success
        } catch (e) {
            // TODO! Add the toast
            window.alert(e);
        }
    };

    // Store token
    //localStorage.setItem('token', response.data.token);
    //redirect to protectec route
    //history.push('/app/frontpage');

    // TODO: should we use maxlength for the input fields?
    // TODO: The link to sign in page must be fixed
    return (
        <div className={styles.page}>
            <div>
                Welcome to the signup page
            </div>
            <form onSubmit={submit}>
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
                <div>
                    Already have an account? Go to login page
                    <a className={styles.link} href="http://localhost:8080/login">
                        here
                    </a>
                </div>
            </form>
        </div>
    )
}

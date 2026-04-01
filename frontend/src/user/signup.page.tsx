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

    const submit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!username || !email || !password) {
            window.alert("Please fill all the fields!");
            return;
        }

        console.log(email);
        
        try {
            emailSchema.parse(email);
        } catch {
            window.alert("Invalid email");
            return;
        }

        if (password != password2) {
            window.alert("The passwords don't match!");
            return;
        }

        const newUser: SigningUser = {
            username: username,
            email: email,
            password: password,
        }

        fetch('/api/signup', {
            method: 'POST',
            body: JSON.stringify(newUser),
            headers: { "Content-Type": "application/json" },
        })
        .then((response) => {
            console.log(response);
            if (!response.ok) {
                return response.text().then((msg) => {
                    throw new Error(msg);
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log("Success:", data);
            //Redirect and show message of success
        })
        .catch((err) => {
            console.log(err);
            window.alert(err);
        });
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
                        type="email" required
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

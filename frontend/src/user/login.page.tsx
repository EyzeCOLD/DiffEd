import styles from "./Login.page.module.css";
import { useState, MouseEvent } from 'react';
//import type {LoginUser} from "#shared/src/types";

export default function LoginPage() {

    const [userCredentials, setUserCredentials] = useState('');
    const [userPassword, setUserPassword] = useState('');

    const submit = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!userCredentials || !userPassword) {
            window.alert("Please fill all the fields!")
            return;
        }

        const user = {
            user: userCredentials,
            password: userPassword,
        }
        fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify(user),
            headers: { "Content-Type": "application/json" },
        } satisfies RequestInit)
        .then((response) => {
            if (!response.ok) throw new Error("Wrong username or password");
            console.log("login successful");
            //TODO(Jyri): Redirect the user to main page
            //use navigate react router 
        })
        .catch((error) => {
            window.alert('Login failed: ' + error.message);
        });
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
                        value={userCredentials}
                        onChange={(e) => setUserCredentials(e.target.value)} />
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


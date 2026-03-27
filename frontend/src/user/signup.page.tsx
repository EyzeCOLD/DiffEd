import styles from "./Login.page.module.css";
import { useState, MouseEvent } from 'react';
import type {SigningUser} from "#shared/src/types";

export default function SignupPage() {

    const [username, setUserName] = useState('');
    const [email, setUserEmail] = useState('');
    const [password, setUserPassword] = useState('');
    const [password2, setUserPassword2] = useState('');

    const submit = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!username || !email || !password) {
            window.alert("Please fill all the fields!");
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
        } satisfies RequestInit)
        .then((response) => {
            if (!response.ok) throw new Error('Something went wrong');
            console.log(response);
            //console.log(`User ${response.row created");
            //TODO(Jyri): Redirect the user to main page
        })
        .catch((err) => {
            console.error("Error:", err);
            window.alert("User creation failed");
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

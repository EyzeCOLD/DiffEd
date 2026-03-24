import styles from "./Login.page.module.css";
import { useState, useEffect } from 'react';

const Login = () => {

    const [userCredentials, setUserCredentials] = useState([]);
    const [userPassword, setUserPassword] = useState([]);

    const submit = (event) => {
        event.preventDefault();
        if (!userCredentials || !userPassword) {
            window.alert("Please fill all the fields!")
            return;
        }
        
        try {
            const handleLogin = () => {
                fetch(`/users/${UserCredentials}`, {
                    method: 'GET',
                    body: JSON.stringify(userPassword),
                    headers: { "Content-Type": "application/json" },
                } satisfies RequestInit).then(() => console.log("
            // Store token
            localStorage.setItem('token', response.data.token);
            //redirect to protectec route
            history.push('/app/frontpage');
        } catch (error) {
            window.alert('Login failed');
        }
    };

    //should we use maxlength for the input fields?
    // When the button is pressed it should send the input credentials to /login
    return (
        <div className={styles.page}>
            <div>
                Welcome to the login page <br />Please insert details
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
                    <a className={styles.link} href="http://localhost:8080">
                        here
                    </a>
                </div>
            </form>
        </div>
    )
}

export default Login

import styles from "./Login.page.module.css";
import { useState } from 'react';

const Signup = () => {

    const [userName, setUserName] = useState([]);
    const [userEmail, setUsetEmail] = useState([]);
    const [userPassword, setUserPassword] = useState([]);
    const [userPassword2, setUserPassword2] = useState([]);

    const submit = (event) => {
        event.preventDefault();
        if (!userName || !userEmail || !userPassword) {
            window.alert("Please fill all the fields!");
            return;
        }
        
        if (userPassword != userPassword2) {
            window.alert("The passwords don't match!");
            return;
        }

        const newUser = {
            userName,
            userEmail,
            userPassword,
        }

        fetch('/api/signup', {
            method: 'POST',
            body: JSON.stringify(newUser),
            headers: { "Content-Type": "application/json" },
        } satisfies RequestInit)
        .then((response) => {
            if (!response.ok) throw new Error('Something went wrong');
            console.log("User created");
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
                Welcome to the signup page!<br />Please insert details
            </div>
            <form onSubmit={submit}>
                <div>
                    <input
                        placeholder="username"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)} />
                </div>
                <div>
                    <input
                        placeholder="repeat password"
                        value={userPassword2}
                        onChange={(e) => setUserPassword2(e.target.value)} />
                </div>
                <div>
                    <button type="submit">login</button>
                </div>
                <div>
                    Already have an account? Go to sign in page
                    <a className={styles.link} href="http://localhost:8080">
                        here
                    </a>
                </div>
            </form>
        </div>
    )
}

export default { Signup };

"use client";

import styles from "./Login.page.module.css";
import { useState, useEffect } from 'react';

const Login = () => {

    const [userName, setUserName] = useState([]);
    const [userPassword, setUserPassword] = useState([]);

    const test = () => {
        event.preventDefault();
        if (!userName) {
            window.alert('Name field empty!')
        }
        
        if (!userPassword) {
            window.alert('Name field empty!')
        }

        const user = new Object {
            username,
            userPassword,
        }

        const login = user => {
            const request = axios.get('/api/login');
            return request.then(response = response.data)
        }
    }

    const handleNameChange = (event) => {
        setUserName(event.target.value)
    }

    const handlePasswordChange = (event) => {
        setUserPassword(event.target.value)
    }

    //should we use maxlength for the input fields?
    return (
        <div className={styles.page}>
            <div>Welcome to the login page!<br />Please insert details</div>
            <form onSubmit={test}>
                <div> <input placeholder="username or email" value={userName} onChange={handleNameChange} /> </div>
                <div> <input placeholder="password" value={userPassword} onChange={handlePasswordChange} /> </div>
                <div> <button type="submit">login</button> </div>
                <div> <a className={styles.link} href="http://localhost:8080">Forgot Password?</a></div>
                <div> Don't have an account? Create one <a className={styles.link} href="http://localhost:8080">here</a></div>
            </form>
        </div>
    )
}

export default Login

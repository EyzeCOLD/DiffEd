"use client";

import styles from "./Login.page.module.css";
import { useState, useEffect } from 'react';
import axios from 'axios';

const Login = () => {

    const [userName, setUserName] = useState([]);
    const [userPassword, setUserPassword] = useState([]);

    const submit = (event) => {
        event.preventDefault();
        if (!userName) {
            window.alert('Name field empty!')
        }
        
        if (!userPassword) {
            window.alert('Name field empty!')
        }

        try {
            const response = axios.post('/api/login', {
                username,
                userPassword,
            });
            // Store token
            localStorage.setItem('token', response.data.token);
            //redirect to protectec route
            history.push('/app/frontpage');
        } catch (error) {
            window.alert('Login failed');
        }
    };

    const handleNameChange = (event) => {
        setUserName(event.target.value)
    }

    const handlePasswordChange = (event) => {
        setUserPassword(event.target.value)
    }

    //should we use maxlength for the input fields?
    // When the button is pressed it should send the input credentials to /login
    return (
        <div className={styles.page}>
            <div>Welcome to the login page!<br />Please insert details</div>
            <form onSubmit={submit}>
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

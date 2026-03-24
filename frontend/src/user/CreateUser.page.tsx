import styles from "./Login.page.module.css";
import { useState, useEffect } from 'react';

const CreateUser = () => {

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
            window.alert("The passwords don't match");
            return;
        }

        const newUser = {
            userName,
            userEmail,
            userPassword,
        }

        fetch('/api/users', {
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

    // NOTE:

    // Store token
    localStorage.setItem('token', response.data.token);
    //redirect to protectec route
    history.push('/app/frontpage');

    //should we use maxlength for the input fields?
    // When the button is pressed it should send the input credentials to /login
    return (
        <div className={styles.page}>
            <div>
                Welcome to the user creation page!<br />Please insert details
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
                    Already have an account? Got to sign in page
                    <a className={styles.link} href="http://localhost:8080">
                        here
                    </a>
                </div>
            </form>
        </div>
    )
}
//FRONTEND
//	const handleAdd = (e) => {
		//e.preventDefault();
		//if (!inputValue.trim()) return;
		//const newTodo = { text: inputValue, completed: false };
		//fetch('/todos', {
			//method: 'POST',
			//headers: { 'Content-Type': 'application/json' },
			//body: JSON.stringify(newTodo),
		//})
			//.then(refreshList)
			//.catch((err) => console.error('Error adding todo:', err));
		//setInputValue('');
	//};
	//const handleDelete = (id) => {
		//fetch(`todos/${id}`, { method: 'DELETE' })
			//.then(refreshList)
			//.catch((err) => console.error('Error deleting todo:', err));
	//};

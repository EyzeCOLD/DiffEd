import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
//import type {MouseEvent, SubmitEvent} from "react";

function Email({email, onEmailUpdate}) {
    const [isEditing, setIsEditing] = useState(false);
    const [newEmail, setNewEmail] = useState(email);

    async function handleSubmitClick() {
        try {
            console.log("HERE");
        } catch (e) {
            console.log("Why error?");
        }
    }

    function handleCancelClick() {
        setIsEditing(false);
        setNewEmail(email);
    }

    return (
        <div>
            {isEditing ? (
                <div>
                    <input
                        type="email"
                        placeholder="example@email.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                    />
                    &nbsp;
                    <button onClick={handleSubmitClick}>Submit</button>
                    &nbsp;
                    <button onClick={handleCancelClick}>Cancel</button>
                </div>
            ) : (
                <div>
                    <span>email: {email}</span>
                    &nbsp;
                    <button onClick={() => setIsEditing(true)}>Change</button>
                </div>
            )}
        </div>
    );
}

export default function UserManagementPage() {
	const [user, setUser] = useState("");
	const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		fetch("/api/user", {
			method: "GET",
			headers: {"Content-Type": "application/json"},
			credentials: "include",
		})
			.then((res) => {
				if (!res.ok) throw new Error("Error fetching user");
				return res.json();
			})
			.then((data) => {
				setUser(data.username);
				setEmail(data.email);
                setLoading(false);
			})
			.catch((error) => {
				console.error(error);
				navigate("/dashboard");
			});
	}, [navigate]);

    function handleEmailUpdate(newEmail) {
        setEmail(newEmail);
    }

	async function deleteAccount() {
		if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
			return;
		}
		try {
			const response = await fetch("/api/user", {
				method: "DELETE",
				//headers: {"Content-Type": "application/json"},
				credentials: "include",
			});

			if (!response.ok) {
				const msg = await response.json();
				window.alert(msg.error || "Failed to delete account");
			}

			console.log("Successfully deleted user");
			navigate("/login");
		} catch (e) {
			window.alert(e);
		}
	}

	return (loading ? (
        <div>Loading...</div>
    ) : (
        <div>
            <div>User Management</div>
            <div>username: {user}</div>
            <div>
                <Email email={email} onEmailUpdate={handleEmailUpdate} /> 
            </div>
            <div>
                <button
                    onClick={deleteAccount}
                    style={{background: "none", cursor: "pointer", padding: 0}}
                    aria-label="Delete account"
                >
                    Delete account
                </button>
            </div>
        </div>
    ));
}
/*
<StaticEmail email={email} />
    <button
        onClick={changeMail}
        style={{background: "none", cursor: "pointer", padding: 0}}
        aria-label="Change email address"
    >
        Change email address
    </button>
 */

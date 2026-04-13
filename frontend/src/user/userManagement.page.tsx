import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
//import type {MouseEvent, SubmitEvent} from "react";
import {z} from "zod";

const emailSchema = z.email();

function Email({email, onEmailUpdate}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newEmail, setNewEmail] = useState(email);

    async function handleSubmitClick() {
        setIsLoading(true);
        try {
            // NOTE: We need the email validity checks here as well
            if (!newEmail) {
                throw new Error("The field cannot be empty");
            }

            const result = emailSchema.safeParse(newEmail);
            if (!result.success) {
                throw new Error("Invalid email");
            }

            const response = await fetch("/api/user", {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({email: newEmail}),
            })
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Unexpected error");
            }
            onEmailUpdate(newEmail);
        } catch (e) {
            console.log("Error updating email:", e.message);
        } finally {
            //TODO: For some reason doesn't go back to original state (the input field still shows
            setIsEditing(false);
            setIsLoading(false);
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
                    <button
                        onClick={handleSubmitClick}
                        disabled={isLoading}
                        style={{cursor: "pointer"}}
                        aria-label="Submit new email address"
                    >
                        {isLoading ? "Saving..." : "Submit"}
                    </button>
                    &nbsp;
                    <button
                        onClick={handleCancelClick}
                        style={{cursor: "pointer"}}
                        aria-label="Cancel email address change"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <div>
                    <span>email: {email}</span>
                    &nbsp;
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{cursor: "pointer"}}
                        aria-label="Change email address"
                    >
                        Change
                    </button>
                </div>
            )}
        </div>
    );
}

export default function UserManagementPage() {
	const [user, setUser] = useState("");
	const [email, setEmail] = useState("");
    //const [bio, setBio] = useState("");
    const [password, setPassword] = useState("");
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
                //setBio(data.bio);
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

	function handleUsernameUpdate(newUsername) {
		setUser(newUsername);
	}

    function handlePasswordUpdate(newPassword) {
        setPassword(newPassword);
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

	return loading ? (
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
	);
}

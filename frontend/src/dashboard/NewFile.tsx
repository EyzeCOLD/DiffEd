import {useState} from "react";
import {useNavigate} from "react-router";
import {Button} from "../components/Button";

function NewFile() {
	const [newFilename, setNewFilename] = useState<string>();
	const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
	const navigate = useNavigate();

	function openNewFile() {
		fetch("/api/files", {
			method: "POST",
			body: JSON.stringify({name: newFilename}),
			headers: [["Content-Type", "application/json"] as [string, string]],
		} satisfies RequestInit)
			.then((response) => {
				if (response.status === 409) {
					const text = response.text();
					console.error(`${text}`);
					window.alert(`${text}`);
					return;
				} else if (!response.ok) {
					console.error("File creation failed!");
					return;
				}
				console.log("New file created!");
				return response.json();
			})
			.then((f) => {
				if (f) navigate(`/edit/${f.id}`);
			});
	}

	return (
		<>
			<Button onClick={() => setShowFilenamePrompt(!showFilenamePrompt)}>New File</Button>
			{showFilenamePrompt ? (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						openNewFile();
					}}
				>
					<input id="fileNameInput" value={newFilename} onChange={(event) => setNewFilename(event.target.value)} />
					<Button type="submit">Submit</Button>
				</form>
			) : null}
		</>
	);
}

export default NewFile;

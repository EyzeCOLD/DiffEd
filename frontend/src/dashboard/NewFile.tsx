import {useState} from "react";
import {useNavigate} from "react-router";
import {Button} from "../components/Button";

function NewFile() {
	const [newFilename, setNewFilename] = useState<string>();
	const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
	const navigate = useNavigate();

	async function openNewFile() {
		try {
			const result = await fetch("/api/files", {
				method: "POST",
				body: JSON.stringify({name: newFilename}),
				headers: [["Content-Type", "application/json"] as [string, string]],
			} satisfies RequestInit);

			const res = await result.json();

			if (result.status === 409) {
				console.error(`${res.error}`);
				window.alert(`${res.error}`);
				return;
			} else if (!result.ok) {
				console.error("File creation failed!");
				return;
			}

			console.log("New file created!");
			if (res) navigate(`/edit/${res.id}`);
		} catch (error) {
			console.error(error);
		}
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

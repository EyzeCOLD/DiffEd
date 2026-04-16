import {useState} from "react";
import {useNavigate} from "react-router";
import {Button} from "#/src/components/Button";
import {useShowToast} from "#/src/components/toastStore.ts";
import {apiFetch} from "#/src/utils.ts";

function NewFile() {
	const [newFilename, setNewFilename] = useState<string>();
	const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
	const navigate = useNavigate();
	const showToast = useShowToast();

	async function openNewFile() {
		try {
			const result = await apiFetch("/api/files", {
				method: "POST",
				body: JSON.stringify({name: newFilename}),
				headers: [["Content-Type", "application/json"] as [string, string]],
			});

			if (!result.ok) {
				console.error("File creation failed!");
				showToast("error", "File creation failed!");
				return;
			}

			console.log("New file created!");
			if (result) navigate(`/edit/${result.data}`);
		} catch (error) {
			console.error(error);
			showToast("error", `${error}`);
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

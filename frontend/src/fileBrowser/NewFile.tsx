import {useState} from "react";
import {useNavigate} from "react-router";
import {Button} from "#/src/components/Button";
import {useShowToast} from "#/src/layout/toastStore.ts";
import {Input} from "#/src/components/Input";
import {apiFetch} from "#/src/utils.ts";

function NewFile() {
	const [newFilename, setNewFilename] = useState<string>();
	const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
	const navigate = useNavigate();
	const showToast = useShowToast();

	async function openNewFile() {
		const fileResult = await apiFetch<string>("/api/files", {
			method: "POST",
			body: JSON.stringify({name: newFilename}),
			headers: [["Content-Type", "application/json"] as [string, string]],
		});

		if (!fileResult.ok) {
			showToast("error", "File creation failed!");
			return;
		}

		const workspaceResult = await apiFetch<{sessionId: string}>("/api/workspace", {
			method: "POST",
			body: JSON.stringify({fileId: fileResult.data}),
			headers: [["Content-Type", "application/json"] as [string, string]],
		});

		if (!workspaceResult.ok) {
			showToast("error", "Failed to open workspace");
			return;
		}

		showToast("success", "New file created!");
		navigate(`/collab/${workspaceResult.data.sessionId}`);
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
					<Input id="fileNameInput" value={newFilename} onChange={(event) => setNewFilename(event.target.value)} />
					<Button type="submit">Submit</Button>
				</form>
			) : null}
		</>
	);
}

export default NewFile;

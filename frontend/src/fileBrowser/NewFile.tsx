import {useState, type JSX} from "react";
import {useNavigate} from "react-router";
import {Button} from "#/src/components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import {Input} from "#/src/components/Input";
import {apiFetch} from "#/src/utils.ts";

type NewFileProps = {
	// When provided, called with the new file's ID instead of creating a workspace and navigating
	onCreated?: (fileId: string) => Promise<void>;
};

function NewFile({onCreated}: NewFileProps): JSX.Element {
	const [newFilename, setNewFilename] = useState<string>();
	const navigate = useNavigate();
	const showToast = useShowToast();

	async function openNewFile() {
		const formData = new FormData();
		const file = new File([""], newFilename!, {type: "text/weee"});
		formData.append("file", file);

		const fileResult = await apiFetch<string>("/api/files", {
			method: "POST",
			body: formData,
		});

		if (!fileResult.ok) {
			showToast("error", "File creation failed!");
			return;
		}

		if (onCreated) {
			await onCreated(fileResult.data);
			return;
		}

		const workspaceResult = await apiFetch<{workspaceId: string}>("/api/workspace", {
			method: "POST",
			body: JSON.stringify({fileId: fileResult.data}),
			headers: [["Content-Type", "application/json"] as [string, string]],
		});

		if (!workspaceResult.ok) {
			showToast("error", "Failed to open workspace");
			return;
		}

		showToast("success", "New file created!");
		navigate(`/collab/${workspaceResult.data.workspaceId}`);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				openNewFile();
			}}
		>
			<Input
				id="fileNameInput"
				value={newFilename}
				placeholder="New file"
				onChange={(event) => setNewFilename(event.target.value)}
			/>
			<Button type="submit">Create</Button>
		</form>
	);
}

export default NewFile;

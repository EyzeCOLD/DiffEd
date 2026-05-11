import {useState, type JSX} from "react";
import Button from "#/src/components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import Input from "#/src/components/Input";
import {apiFetch} from "#/src/utils.ts";

type NewFileProps = {
	onFileCreate: (fileId: string) => void;
};

function NewFile({onFileCreate}: NewFileProps): JSX.Element {
	const [newFilename, setNewFilename] = useState<string>("");
	const showToast = useShowToast();

	async function openNewFile() {
		if (newFilename === "") {
			showToast("error", "Filename can't be empty");
			return;
		}

		const formData = new FormData();
		const file = new File([""], newFilename!, {type: "text/plain"});
		formData.append("file", file);

		const fileResult = await apiFetch<string[]>("/api/files", {
			method: "POST",
			body: formData,
		});

		if (!fileResult.ok) {
			showToast("error", `File creation failed: ${fileResult.error}`);
			return;
		}
		const fileId = fileResult.data[0];

		onFileCreate(fileId);
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

import {useState, type JSX} from "react";
import Button from "#/src/components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import Input from "#/src/components/Input";
import {apiFetch} from "#/src/utils.ts";

type NewFileProps = {
	onFileSelect: (fileId: string) => void;
};

function NewFile({onFileSelect}: NewFileProps): JSX.Element {
	const [newFilename, setNewFilename] = useState<string>();
	const showToast = useShowToast();

	async function openNewFile() {
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

		onFileSelect(fileId);
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

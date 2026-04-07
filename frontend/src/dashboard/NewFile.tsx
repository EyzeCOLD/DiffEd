import {useState} from "react";
import {useNavigate} from "react-router";
import {Button} from "../components/Button";
import {useToastStore} from "../components/toastStore.ts";

function NewFile() {
	const [newFilename, setNewFilename] = useState<string>();
	const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
	const navigate = useNavigate();
	const showToast = useToastStore((s) => s.showToast);

	async function openNewFile() {
		try {
			const formData = new FormData();
			const file = new File([""], newFilename!, {type: "text/weee"});
			formData.append("file", file);
			const result = await fetch("/api/files", {
				method: "POST",
				body: formData,
			} satisfies RequestInit);

			const res = await result.json();

			if (result.status === 409) {
				console.error(`${res.error}`);
				showToast("error", `${res.error}`);
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

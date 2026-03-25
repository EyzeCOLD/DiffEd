import {useState} from "react";
import {useNavigate} from "react-router";

function NewFile() {
	const [newFilename, setNewFilename] = useState<string>();
	const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
	const navigate = useNavigate();

	function openNewFile() {
		fetch("/api/files", {
			method: "POST",
			body: JSON.stringify({name: newFilename}),
			headers: [["Content-Type", "application/json"] as [string, string]],
		} satisfies RequestInit).then((res) => {
			if (res.ok) {
				console.log(res);
				navigate("/edit/200");
			}
		});
	}

	return (
		<>
			<button onClick={() => setShowFilenamePrompt(!showFilenamePrompt)}>New file</button>
			{showFilenamePrompt ? (
				<form>
					<input value={newFilename} onChange={(event) => setNewFilename(event.target.value)} />
					<button
						onClick={(e) => {
							e.preventDefault();
							openNewFile();
						}}
					>
						Submit
					</button>
				</form>
			) : null}
		</>
	);
}

export default NewFile;

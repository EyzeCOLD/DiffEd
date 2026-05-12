import FileBrowser from "./FileBrowser";
import {useNavigate} from "react-router";
import {apiFetch} from "#/src/utils.ts";

function FileBrowserPage() {
	const navigate = useNavigate();

	async function startSessionFromFile(fileId: string) {
		const response = await apiFetch<{workspaceId: string}>("/api/workspace", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({fileId: fileId}),
		});
		if (!response.ok) {
			throw response.error;
		}
		navigate(`/collab/${response.data.workspaceId}`);
	}

	return (
		<div className="p-4 flex flex-col gap-2">
			<FileBrowser onFileSelect={startSessionFromFile} />
		</div>
	);
}

export default FileBrowserPage;

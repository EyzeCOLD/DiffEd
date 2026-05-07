import type {UserFile} from "#shared/src/types";
import {useNavigate} from "react-router";
import type {JSX} from "react";
import type {ApiResponse} from "#shared/src/types.js";
import {apiFetch} from "#/src/utils.js";
import {useShowToast} from "#/src/stores/toastStore";
import {Button} from "#/src/components/Button";

function FileList({
	fileList,
	refreshFileList,
}: {
	fileList: UserFile[] | null;
	refreshFileList: () => void;
}): JSX.Element {
	const navigate = useNavigate();
	const showToast = useShowToast();

	if (!fileList) return <p>Loading really slow...</p>;
	if (fileList.length === 0) return <p>You lead a fileless existence.</p>;

	async function startSessionFromFile(file: UserFile) {
		const response = await apiFetch<{workspaceId: string}>("/api/workspace", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({fileId: file.id}),
		});
		if (!response.ok) {
			showToast("error", response.error);
			return;
		}
		navigate(`/collab/${response.data.workspaceId}`);
	}

	async function handleDownload(file: UserFile) {
		const response: ApiResponse<UserFile> = await apiFetch(`/api/files/${file.id}`);

		if (!response.ok) {
			console.error(response.error);
			showToast("error", `${response.error}`);
			return;
		}

		const blob = new Blob([response.data.content], {type: "text/plain"});

		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = file.name;
		a.click();

		URL.revokeObjectURL(url);
	}

	async function handleDelete(id: string) {
		if (!window.confirm("Are you sure you want to delete this file?")) return;

		const response: ApiResponse<null> = await apiFetch(`/api/files/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			console.error(response.error);
			showToast("error", `${response.error}`);
		} else {
			showToast("info", "File deleted");
		}
		refreshFileList();
	}

	const listItems: JSX.Element[] = fileList.map<JSX.Element>((file: UserFile) => {
		return (
			<tr key={file.id}>
				<td>
					<button
						type="button"
						className="bg-transparent border-0 p-0 text-inherit cursor-pointer hover:underline"
						onClick={() => startSessionFromFile(file)}
					>
						🗎 {file.name}
					</button>
				</td>
				<td className="text-center">
					<Button onClick={() => handleDownload(file)}> 🡻 </Button>
				</td>
				<td className="text-center">
					<Button onClick={() => handleDelete(file.id)}> ☒ </Button>
				</td>
			</tr>
		);
	});

	return (
		<table id="file list">
			<thead>
				<th>filename</th>
				<th>download</th>
				<th>delete</th>
			</thead>
			<tbody>{listItems}</tbody>
		</table>
	);
}

export default FileList;

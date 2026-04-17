import type {UserFile} from "#shared/src/types";
import {Link} from "react-router";
import type {JSX} from "react";
import {Button} from "#/src/components/Button";
import type {ApiResponse} from "#shared/src/types.js";
import {apiFetch} from "#/src/utils.js";
import {useToastStore} from "#/src/components/toastStore.ts";

function FileList({
	fileList,
	refreshFileList,
}: {
	fileList: UserFile[] | null;
	refreshFileList: () => void;
}): JSX.Element {
	if (!fileList) return <p>Loading really slow...</p>;
	if (fileList.length === 0) return <p>You lead a fileless existence.</p>;
	const showToast = useToastStore((s) => s.showToast);

	async function handleDownload(file: UserFile) {
		const response: ApiResponse<string> = await apiFetch(`/api/files/${file.id}/download`);

		if (!response.ok) {
			console.error(response.error);
			showToast("error", `${response.error}`);
			return;
		}
		console.log(`Downloading file...`);
		showToast("info", "Downloading file...");

		const blob = new Blob([response.data], {type: "text/plain"});
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = file.name;
		a.click();

		URL.revokeObjectURL(url);
	}

	async function handleDelete(id: string) {
		if (!window.confirm("Are you sure you want to delete this file?")) return;

		const response: ApiResponse<string> = await apiFetch(`/api/files/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			console.error(response.error);
			showToast("error", `${response.error}`);
		} else {
			console.log("Delete succesful");
			showToast("info", "File deleted");
		}
		refreshFileList();
	}

	const listItems: JSX.Element[] = fileList.map<JSX.Element>((file: UserFile) => {
		return (
			<tr key={file.id}>
				<td>
					<Link to={`/edit/${file.id}`}>🗎 {file.name}</Link>
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

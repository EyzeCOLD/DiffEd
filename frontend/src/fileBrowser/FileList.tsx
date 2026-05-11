import type {UserFile} from "#shared/src/types";
import type {JSX} from "react";
import type {ApiResponse} from "#shared/src/types.js";
import {apiFetch} from "#/src/utils.js";
import {useShowToast} from "#/src/stores/toastStore";
import Button from "#/src/components/Button";

type fileListProps = {
	onFileSelect: (fileId: string) => void;
	fileList: UserFile[];
	refreshFileList: () => void;
	onSortToggle: () => void;
	descending: boolean;
};

function FileList({onFileSelect, fileList, refreshFileList, onSortToggle, descending}: fileListProps): JSX.Element {
	const showToast = useShowToast();

	if (fileList.length === 0) return <p>No files to show.</p>;

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
						onClick={() => onFileSelect(file.id)}
					>
						{file.name}
					</button>
				</td>
				<td className="text-center">
					<Button onClick={() => handleDownload(file)}>{" 🡻 "}</Button>
				</td>
				<td className="text-center">
					<Button onClick={() => handleDelete(file.id)} className="font-bold">
						{" X "}
					</Button>
				</td>
			</tr>
		);
	});

	return (
		<table id="file-list">
			<thead>
				<th>
					filename
					<Button className="bg-transparent" onClick={() => onSortToggle()}>
						{descending ? "▾" : "▴"}
					</Button>
				</th>
				<th>download</th>
				<th>delete</th>
			</thead>
			<tbody>{listItems}</tbody>
		</table>
	);
}

export default FileList;

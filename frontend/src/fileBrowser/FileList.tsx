import type {FileListItem, UserFile} from "#shared/src/types";
import type {JSX} from "react";
import type {ApiResponse} from "#shared/src/types.js";
import {apiFetch} from "#/src/utils.js";
import {useShowToast} from "#/src/stores/toastStore";
import Button from "#/src/components/Button";

type fileListProps = {
	onFileSelect: (fileId: string) => Promise<void>;
	fileList: FileListItem[];
	refreshFileList: () => void;
	onSortToggle: () => void;
	descending: boolean;
};

const MAX_VIEWABLE_FILENAME_LEN = 32;

function FileList({onFileSelect, fileList, refreshFileList, onSortToggle, descending}: fileListProps): JSX.Element {
	const showToast = useShowToast();

	if (fileList.length === 0) return <div className="flex justify-center items-center">No files to show.</div>;

	async function handleDownload(file: FileListItem) {
		const response: ApiResponse<Pick<UserFile, "content">> = await apiFetch(`/api/files/${file.id}`);

		if (!response.ok) {
			showToast("error", `${response.error}`);
			refreshFileList();
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
			showToast("error", `${response.error}`);
		} else {
			showToast("info", "File deleted");
		}
		refreshFileList();
	}

	async function selectFile(fileId: string) {
		try {
			await onFileSelect(fileId);
		} catch (err) {
			if (typeof err === "string" && err) {
				showToast("error", err);
			} else if (err instanceof Error) {
				showToast("error", err.message);
			}
			refreshFileList();
		}
	}

	function truncateFileName(filename: string) {
		return filename.slice(0, MAX_VIEWABLE_FILENAME_LEN - 9) + "..." + filename.slice(filename.length - 6);
	}

	const listItems: JSX.Element[] = fileList.map<JSX.Element>((file: FileListItem) => {
		return (
			<tr key={file.id} className="bg-surface-dark border-4 border-collapse border-canvas">
				<td>
					<button type="button" className="cursor-pointer hover:underline mx-4" onClick={() => selectFile(file.id)}>
						{file.name.length <= MAX_VIEWABLE_FILENAME_LEN ? file.name : truncateFileName(file.name)}
					</button>
				</td>
				<td className="text-center w-fit">
					<Button onClick={() => handleDownload(file)}>{" 🡻 "}</Button>
				</td>
				<td className="text-center w-fit">
					<Button onClick={() => handleDelete(file.id)} className="font-bold" danger={true}>
						{" X "}
					</Button>
				</td>
			</tr>
		);
	});

	return (
		<table id="file-list" className="mx-auto w-full max-w-2xl">
			<thead>
				<th className="min-w-64">
					filename
					<Button className="bg-transparent" onClick={() => onSortToggle()}>
						{descending ? "▾" : "▴"}
					</Button>
				</th>
			</thead>
			<tbody>{listItems}</tbody>
		</table>
	);
}

export default FileList;

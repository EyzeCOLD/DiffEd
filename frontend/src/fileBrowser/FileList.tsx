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

const MAX_VIEWABLE_FILENAME_LEN = 24;

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
			<li key={file.id} className="bg-surface-dark border-2 rounded-sm border-canvas">
				<span className="flex items-center">
					<button
						type="button"
						className="cursor-pointer hover:underline mx-4 flex-1 text-left"
						onClick={() => selectFile(file.id)}
					>
						{file.name.length <= MAX_VIEWABLE_FILENAME_LEN ? file.name : truncateFileName(file.name)}
					</button>
					<span className="ml-auto flex items-center">
						<Button onClick={() => handleDownload(file)}>{" 🡻 "}</Button>
						<Button onClick={() => handleDelete(file.id)} className="font-bold" danger={true}>
							{" X "}
						</Button>
					</span>
				</span>
			</li>
		);
	});

	return (
		<div id="file-list" className="mx-auto w-full max-w-2xl">
			<span className="m-2">
				filename
				<Button className="bg-transparent" onClick={() => onSortToggle()}>
					{descending ? "▾" : "▴"}
				</Button>
			</span>
			<ol>{listItems}</ol>
		</div>
	);
}

export default FileList;

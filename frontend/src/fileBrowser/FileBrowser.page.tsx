import FileList from "./FileList";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import type {UserFile, ApiResponse} from "#shared/src/types";
import {useState, useEffect} from "react";
import {apiFetch} from "#/src/utils";
import {useShowToast} from "#/src/layout/toastStore.ts";

function FileBrowserPage() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);
	const showToast = useShowToast();

	async function refreshFileList() {
		const response: ApiResponse<UserFile[]> = await apiFetch("/api/files");
		if (response.ok) {
			setFileList(response.data);
		} else {
			console.error(response.error);
			showToast("error", `${response.error}`);
		}
	}

	useEffect(() => void refreshFileList(), []);

	return (
		<>
			<FileList fileList={fileList} refreshFileList={refreshFileList} />
			<NewFile />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

export default FileBrowserPage;

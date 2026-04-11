import FileList from "./FileList";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import type {UserFile, ApiResponse} from "#shared/src/types";
import {useState, useEffect} from "react";

function FileBrowserPage() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);

	async function refreshFileList() {
		const response: ApiResponse<UserFile[]> = await fetch("/api/files").then((r) => r.json());
		if (response.ok) {
			setFileList(response.data);
		} else {
			console.error(response.error);
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

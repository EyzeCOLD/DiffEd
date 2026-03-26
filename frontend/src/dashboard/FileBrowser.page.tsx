import FileList from "./FileList";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import type {UserFile} from "#shared/src/types";
import {useState, useEffect} from "react";

function FileBrowserPage() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);

	function refreshFileList() {
		fetch("/api/files")
			.then((res) => res.json())
			.then((res) => {
				setFileList(res);
			});
	}

	useEffect(refreshFileList, []);

	return (
		<>
			<FileList fileList={fileList} refreshFileList={refreshFileList} />
			<NewFile />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

export default FileBrowserPage;

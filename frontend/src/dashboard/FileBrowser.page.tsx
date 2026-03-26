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

	async function handleDelete(id: string) {
		try {
			const result = await fetch(`/api/files/${id}`, {
				method: "DELETE",
			});
			if (!result.ok) {
				console.error("something wrong :(");
			}
			const data = await result.json();
			console.log(data);
			refreshFileList();
		} catch (error) {
			console.error(error);
		}
	}

	useEffect(refreshFileList, []);

	return (
		<>
			<FileList fileList={fileList} handleDelete={handleDelete} />
			<NewFile />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

export default FileBrowserPage;

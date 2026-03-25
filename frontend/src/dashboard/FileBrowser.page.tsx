import FileList from "./FileList";
import NewFile from "./NewFile";
import type {UserFile} from "#shared/src/types";
import {useState, useEffect} from "react";

function FileBrowserPage() {
	const [files, setFiles] = useState<UserFile[] | null>(null);
	useEffect(() => {
		fetch("/api/files")
			.then((res) => res.json())
			.then((res) => {
				setFiles(res);
			});
	}, []);

	return (
		<>
			<FileList files={files} />
			<NewFile />
		</>
	);
}

export default FileBrowserPage;

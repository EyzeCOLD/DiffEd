import {type JSX} from "react";
import {CollabConnection, pickFile} from "./collabClient";
import FileBrowser from "../fileBrowser/FileBrowser";
import {useShowToast} from "../stores/toastStore";
import useFileBrowser from "../fileBrowser/useFileBrowser";

type FilePickerProps = {
	connection: CollabConnection;
};

function FilePicker({connection}: FilePickerProps): JSX.Element {
	const showtoast = useShowToast();
	const {refreshFileList} = useFileBrowser();

	async function handlePick(fileId: string) {
		try {
			await pickFile(connection, fileId);
		} catch (err) {
			const error: Error = err as Error;
			console.log(error.message);
			showtoast("error", error.message);
			refreshFileList();
		}
	}

	return (
		<div className="p-4 flex flex-col gap-2">
			<h2 className="text-lg">Pick a file to bring into this session</h2>
			<FileBrowser onFileSelect={handlePick} />
		</div>
	);
}

export default FilePicker;

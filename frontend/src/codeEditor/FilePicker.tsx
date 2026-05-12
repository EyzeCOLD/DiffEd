import {type JSX} from "react";
import {CollabConnection, pickFile} from "./collabClient";
import FileBrowser from "../fileBrowser/FileBrowser";

type FilePickerProps = {
	connection: CollabConnection;
};

function FilePicker({connection}: FilePickerProps): JSX.Element {
	async function handlePick(fileId: string) {
		try {
			await pickFile(connection, fileId);
		} catch (err) {
			if (err && typeof err === "object" && "message" in err) {
				if (typeof err.message === "string") throw err.message;
			} else {
				throw "socker error";
			}
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

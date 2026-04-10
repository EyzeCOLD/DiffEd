import {useState, useRef} from "react";
import {Button} from "../components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import {Input} from "../components/Input";
import {apiFetch} from "#/src/utils.js";
import type {ApiResponse} from "#shared/src/types.ts";
import {fileNotValid} from "#shared/src/fileTypeCheck";

function FileUploader({refreshFileList}: {refreshFileList: () => void}) {
	const [fileUploads, setFileUploads] = useState<Array<File> | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const showToast = useShowToast();

	function resetInput() {
		setFileUploads(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		const newFileArray = fileUploads?.slice() ?? new Array<File>();
		for (const f of e.target.files) {
			const err = fileNotValid(f.type, f.size, await f.text());
			if (err) {
				showToast("error", `File '${f.name}' is ${err}`);
				console.error(`File '${f.name}' is ${err}`);
			} else {
				const index = newFileArray.findIndex(
					(value: File) =>
						value.name === f.name && value.webkitRelativePath === f.webkitRelativePath && value.size === f.size,
				);
				if (index !== -1) {
					if (f.lastModified <= newFileArray[index].lastModified) {
						showToast("info", `Duplicate file ${f.name}`);
						console.error(`Duplicate file ${f.name}`);
					} else {
						newFileArray[index] = f;
						showToast("info", `Updated file ${f.name}`);
					}
				} else {
					newFileArray.push(f);
				}
			}
		}

		if (newFileArray.length > 0) setFileUploads(newFileArray);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	async function handleRemove(name: string) {
		if (fileUploads === null) return;

		const newFileArray = fileUploads.filter((value: File) => value.name !== name);
		if (newFileArray.length) setFileUploads(newFileArray);
		else resetInput();
		// else console.log("trying to remove nonexistent file", name);
	}

	async function handleUpload() {
		if (fileUploads) {
			console.log("Uploading file(s)...", fileUploads);
			showToast("info", "Uploading file(s)...");

			const formData = new FormData();
			[...fileUploads].forEach((file: File) => {
				formData.append("file", file);
			});

			const response: ApiResponse<null> = await apiFetch("/api/files", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				// could do more handling here
				console.error(`${response.error}`);
				showToast("error", `${response.error}`);
				resetInput();
				return;
			}

			resetInput();
			refreshFileList();
			console.log("File(s) uploaded");
			showToast("success", "File(s) uploaded");
		}
	}

	return (
		<>
			<div className="input-group">
				<Input
					ref={fileInputRef}
					style={{display: "none"}}
					id="file"
					type="file"
					multiple
					onChange={handleFileChange}
				/>
				<Button onClick={() => fileInputRef.current?.click()}>Upload Files</Button>
			</div>
			{fileUploads && (
				<>
					<table>
						<thead>
							<th>file(s)</th>
						</thead>
						<tbody>
							{fileUploads &&
								[...fileUploads].map((file) => (
									<tr key={file.name}>
										<td>🗎 {file.name}</td>
										<td className="text-center">
											<Button onClick={() => handleRemove(file.name)}> ☒ </Button>
										</td>
									</tr>
								))}
						</tbody>
					</table>
					<Button onClick={() => handleUpload()}>Submit</Button>
				</>
			)}
		</>
	);
}

export default FileUploader;

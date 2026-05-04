import {useState, useRef} from "react";
import {Button} from "../components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import {Input} from "../components/Input";
import {apiFetch} from "#/src/utils.js";
import type {ApiResponse} from "#shared/src/types.ts";

function FileUploader({refreshFileList}: {refreshFileList: () => void}) {
	const [fileUploads, setFileUploads] = useState<FileList | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const MAX_FILE_SIZE = 1000000; // 1meg
	const showToast = useShowToast();

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		for (const f of e.target.files) {
			if (f.size > MAX_FILE_SIZE) {
				console.error(`File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
				showToast("error", `File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
				setFileUploads(null);
				return;
			}
		}

		setFileUploads(e.target.files);
	}

	async function handleUpload() {
		if (fileUploads) {
			console.log("Uploading file(s)...", fileUploads);
			showToast("info", "Uploading file(s)...");

			const formData = new FormData();
			[...fileUploads].forEach(function (file: File) {
				formData.append("file", file);
			});

			const response: ApiResponse<null> = await apiFetch("/api/files/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				console.error(`${response.error}`);
				showToast("error", `${response.error}`);
				setFileUploads(null);
				return;
			}

			refreshFileList();
			setFileUploads(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
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

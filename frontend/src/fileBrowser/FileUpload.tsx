import {useState, useRef} from "react";
import Button from "../components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import Input from "../components/Input";
import {apiFetch} from "#/src/utils.js";
import type {ApiResponse} from "#shared/src/types.ts";
import {validateFile} from "#shared/src/fileValidation";

// if uploading
function FileUploader({refreshFileList}: {refreshFileList: () => void}) {
	const [fileUploads, setFileUploads] = useState<Map<string, File> | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const showToast = useShowToast();

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		const newFileArray: File[] = [];
		const newFilemap = fileUploads ?? new Map<string, File>();
		for (const f of e.target.files) {
			const err = validateFile(f.type, f.size, await f.text(), f.name);
			if (err) {
				showToast("error", `File '${f.name}': ${err}`);
				console.error(`File '${f.name}' is ${err}`);
			} else {
				if (newFilemap.has(f.name)) {
					showToast("error", `Duplicate file ${f.name}`);
				} else {
					newFilemap.set(f.name, f);
					newFileArray.push(f);
				}
			}
		}
		if (newFilemap.size > 0) setFileUploads(newFilemap);
		if (fileInputRef.current) fileInputRef.current.value = "";

		for (const f of newFileArray) uploadFile(f);

		// const promises = newFileArray.map(async (file: File) => {
		// 	await uploadFile(file);
		// });
		// await Promise.allSettled(promises);
		// refreshFileList();
		// await Promise.allSettled(promises);
		// resetInput();
	}

	async function handleRemove(name: string) {
		setFileUploads((prev) => {
			if (!prev) return null;
			const result = new Map(prev);
			result.delete(name);

			if (result.size) return result;
			else return null;
		});
	}

	async function uploadFile(file: File) {
		if (!file) {
			console.log("Tried to upload non existent file");
			return {ok: false, error: "Tried to upload non existent file"} as ApiResponse<string>;
		}
		showToast("info", `Uploading file ${file.name}`);
		const formData = new FormData();
		formData.append("file", file);

		const response: ApiResponse<string> = await apiFetch("/api/files", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			console.error(`${response.error}`);
			if (response.error === "Network error") {
				showToast("error", "Network error: Try to reupload files");
			} else {
				showToast("error", response.error);
			}
		} else {
			console.log(`File ${file.name} uploaded`);
			showToast("success", `File ${file.name} uploaded`);
		}
		handleRemove(file.name);
		// @WARN calling this here probably causes many re render when uploads finish at similar times
		console.log(file.name, "refreshing");
		refreshFileList();
		return Promise.resolve();
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
								[...fileUploads.values()].map((file) => (
									<tr key={file.name}>
										<td>🗎 {file.name}</td>
										<td className="text-center">
											<Button onClick={() => handleRemove(file.name)}> ☒ </Button>
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</>
			)}
		</>
	);
}

export default FileUploader;

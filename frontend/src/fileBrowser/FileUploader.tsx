import {useState, useRef} from "react";
import Button from "../components/Button";
import {useShowToast} from "#/src/stores/toastStore";
import Input from "../components/Input";
import {apiFetch} from "#/src/utils.js";
import type {ApiResponse, FileListItem} from "#shared/src/types.ts";
import {validateFile} from "#shared/src/fileValidation";

type FileUploaderProps = {
	pushToFileList: (file: FileListItem) => void;
	refreshFileList: () => Promise<void>;
};

function FileUploader({pushToFileList, refreshFileList}: FileUploaderProps) {
	const [fileUploads, setFileUploads] = useState<Map<string, File> | null>(null);
	const [uploadOnGoing, setUploadOnGoing] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const showToast = useShowToast();

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		setUploadOnGoing(true);
		const newFileArray: File[] = [];
		const newFilemap = fileUploads ?? new Map<string, File>();
		for (const f of e.target.files) {
			const err = validateFile(f.type, f.size, await f.text(), f.name);
			if (err) {
				showToast("error", `File '${f.name}': ${err}`);
			} else {
				if (newFilemap.has(f.name)) {
					showToast("error", `Duplicate file ${f.name}`);
				} else {
					newFilemap.set(f.name, f);
					newFileArray.push(f);
				}
			}
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
		if (newFilemap.size <= 0) return;

		setFileUploads(newFilemap);

		const uploads: Promise<void>[] = newFileArray.map(async (f) => {
			return await uploadFile(f);
		});
		await Promise.allSettled(uploads);
		const msg =
			newFileArray.length == 1 ? `File ${newFileArray[0].name} uploaded` : `All ${newFileArray.length} uploaded`;
		showToast("success", msg);
		refreshFileList();
		setUploadOnGoing(false);
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
			return Promise.resolve();
		}

		const formData = new FormData();
		formData.append("file", file);

		const response: ApiResponse<string> = await apiFetch("/api/files", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			if (response.error === "Network error") {
				showToast("error", "Network error: Try to reupload files");
			} else {
				showToast("error", response.error);
			}
		} else {
			const listFile: FileListItem = {name: file.name, id: response.data};
			pushToFileList(listFile);
		}
		handleRemove(file.name);
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
				<Button disabled={uploadOnGoing} onClick={() => fileInputRef.current?.click()}>
					Upload Files
				</Button>
			</div>
			{fileUploads && (
				<table className="pt-8">
					<tbody>
						{fileUploads &&
							[...fileUploads.values()].map((file) => (
								<tr key={file.name}>
									<td className="px-2">{file.name}</td>
									<td className="text-center">
										<span className="loader"></span>
									</td>
								</tr>
							))}
					</tbody>
				</table>
			)}
		</>
	);
}

export default FileUploader;

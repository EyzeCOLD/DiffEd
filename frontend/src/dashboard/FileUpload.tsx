import {useState, useRef} from "react";
import {Button} from "../components/Button";
import {useToastStore} from "../components/toastStore.ts";
import {fileNotValid} from "#shared/src/fileTypeCheck";

function FileUploader({refreshFileList}: {refreshFileList: () => void}) {
	const [fileUploads, setFileUploads] = useState<FileList | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const showToast = useToastStore((s) => s.showToast);

	function resetInput() {
		setFileUploads(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		for (const f of e.target.files) {
			const err = fileNotValid(f.type, f.size, await f.text());
			if (err) {
				showToast("error", `File '${f.name}' is ${err}`);
				window.alert(`File '${f.name}' is ${err}`);
				console.error(`File '${f.name}' is ${err}`);
				resetInput();
				return;
			}
		}

		setFileUploads(e.target.files);
	}

	async function handleUpload() {
		if (fileUploads) {
			console.log("Uploading file(s)...", fileUploads);

			const formData = new FormData();
			[...fileUploads].forEach((file: File) => {
				formData.append("file", file);
			});

			try {
				const result = await fetch("/api/files", {
					method: "POST",
					body: formData,
				});

				if (result.status === 409) {
					const res = await result.json();
					console.error(`${res.error.detail}`);
					showToast("error", `${res.error.detail}`);
					resetInput();
					return;
				}

				if (!result.ok) {
					window.alert("File creation failed!");
					console.error("File creation failed!");
					resetInput();
					return;
				}
				const data = await result.json();
				refreshFileList();
				resetInput();
				console.log(data);
			} catch (error) {
				console.error(error);
			}
		}
	}

	return (
		<>
			<div className="input-group">
				<input
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

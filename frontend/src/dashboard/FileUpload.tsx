import {useState, useRef} from "react";
import {Button} from "../components/Button";
import {useShowToast} from "../components/toastStore.ts";

function FileUploader({refreshFileList}: {refreshFileList: () => void}) {
	const [fileUploads, setFileUploads] = useState<Array<File> | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const MAX_FILE_SIZE = 1000000; // 1meg
	const showToast = useShowToast();

	function resetInput() {
		setFileUploads(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		const newFileArray = fileUploads?.slice() ?? new Array<File>();
		for (const f of e.target.files) {
			if (f.size > MAX_FILE_SIZE) {
				showToast("error", `File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
				console.error(`File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
				setFileUploads(null);
				return;
			}
			newFileArray.push(f);
		}

		setFileUploads(newFileArray);
		console.log(fileUploads);
	}

	async function handleRemove(name: string) {
		if (fileUploads === null) return;
		const newFileArray = fileUploads.filter((value: File) => value.name !== name);
		if (newFileArray.length) setFileUploads(newFileArray);
		else setFileUploads(null);
		// else console.log("trying to remove nonexistent file", name);
	}

	async function handleUpload() {
		if (fileUploads) {
			console.log("Uploading file(s)...", fileUploads);

			const formData = new FormData();
			[...fileUploads].forEach((file: File) => {
				formData.append("file", file);
			});

			try {
				const result = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});

				if (result.status === 409) {
					const res = await result.json();
					console.error(`${res.error.detail}`);
					showToast("error", `${res.error.detail}`);
					return;
				}

				if (!result.ok) {
					showToast("error", `File creation failed! UNKNOWN REASON`);
					console.error(`File creation failed! UNKNOWN REASON`);
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

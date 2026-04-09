import {useState, useRef} from "react";
import {Button} from "../components/Button";

function FileUploader({refreshFileList}: {refreshFileList: () => void}) {
	const [fileUploads, setFileUploads] = useState<FileList | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const MAX_FILE_SIZE = 1000000; // 1meg

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			for (const f of e.target.files) {
				if (f.size > MAX_FILE_SIZE) {
					window.alert(`File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
					console.error(`File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
					setFileUploads(null);
					return;
				}
			}
		}

		if (e.target.files) {
			setFileUploads(e.target.files);
		}
	};

	const handleUpload = async () => {
		if (fileUploads) {
			console.log("Uploading file(s)...", fileUploads);

			const formData = new FormData();
			[...fileUploads].forEach(function (file: File) {
				formData.append("file", file);
			});

			try {
				const result = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});

				const data = await result.json();
				refreshFileList();
				setFileUploads(null);
				if (fileInputRef.current) fileInputRef.current.value = "";
				console.log(data);
			} catch (error) {
				console.error(error);
			}
		}
	};

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

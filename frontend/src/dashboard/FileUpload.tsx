import {useState, useRef} from "react";

const FileUploader = ({refreshFileList}: {refreshFileList: () => void}) => {
	const [fileUploads, setFileUploads] = useState<FileList | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const MAX_FILE_SIZE = 1000000; // 1meg

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			for (const f of e.target.files) {
				if (f.size > MAX_FILE_SIZE) {
					console.error(`File '${f.name}' too large at ${f.size} (max. ${MAX_FILE_SIZE})`);
					e.target.value = "";
				}
			}
		}

		if (e.target.files) {
			setFileUploads(e.target.files);
		}
	};

	const handleUpload = async () => {
		if (fileUploads) {
			console.log("Uploading file...");

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
				<input ref={fileInputRef} id="file" type="file" multiple accept="text/*" onChange={handleFileChange} />
			</div>
			<table>
				<thead>
					<th>filename</th>
					<th>size</th>
					<th>type</th>
				</thead>
				<tbody>
					{fileUploads &&
						[...fileUploads].map((file) => (
							<tr key={file.name}>
								<td>{file.name}</td>
								<td>{file.size} bytes</td>
								<td>{file.type}</td>
							</tr>
						))}
				</tbody>
			</table>
			{fileUploads && <button onClick={handleUpload}>Upload a file</button>}
		</>
	);
};

export default FileUploader;

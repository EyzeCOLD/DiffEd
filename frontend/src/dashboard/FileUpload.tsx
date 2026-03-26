import {useState, useRef} from "react";

const FileUploader = ({refreshFileList}: {refreshFileList: () => void}) => {
	const [fileUploads, setFileUploads] = useState<FileList | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
				<input ref={fileInputRef} id="file" type="file" multiple onChange={handleFileChange} />
			</div>
			{fileUploads &&
				[...fileUploads].map((file, index) => (
					<section key={file.name}>
						File {index + 1}:
						<ul>
							<li>Name: {file.name}</li>
							<li>Type: {file.type}</li>
							<li>Size: {file.size} bytes</li>
						</ul>
					</section>
				))}

			{fileUploads && <button onClick={handleUpload}>Upload a file</button>}
		</>
	);
};

export default FileUploader;

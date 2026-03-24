import React, {useState} from "react";

const FileUploader = () => {
	const [files, setFiles] = useState<FileList | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			setFiles(e.target.files);
		}
	};

	const handleUpload = async () => {
		if (files) {
			console.log("Uploading file...");

			const formData = new FormData();
			[...files].forEach(function (file: File) {
				formData.append("files", file);
			});

			try {
				const result = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});

				const data = await result.json();

				console.log(data);
			} catch (error) {
				console.error(error);
			}
		}
	};

	return (
		<>
			<div className="input-group">
				<input id="file" type="file" multiple onChange={handleFileChange} />
			</div>
			{files &&
				[...files].map((file, index) => (
					<section key={file.name}>
						File {index + 1}:
						<ul>
							<li>Name: {file.name}</li>
							<li>Type: {file.type}</li>
							<li>Size: {file.size} bytes</li>
						</ul>
					</section>
				))}

			{files && (
				<button onClick={handleUpload} className="submit">
					Upload a file
				</button>
			)}
		</>
	);
};

export default FileUploader;

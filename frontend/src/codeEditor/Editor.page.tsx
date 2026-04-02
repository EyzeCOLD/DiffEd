import CodeEditor from "./CodeEditor";
import {useParams} from "react-router";
import type {UserFile} from "#shared/src/types";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router";

export default function EditorPage() {
	const [fileData, setFileData] = useState<UserFile | null>(null);
	const params = useParams();
	const navigate = useNavigate();

	useEffect(() => {
		if (!fileData) return;
		fetch(`/api/files/${params.fileId}`, {
			method: "PUT",
			body: JSON.stringify(fileData),
			headers: [["Content-Type", "application/json"] as [string, string]],
		} satisfies RequestInit)
			.then((response) => {
				if (!response.ok) {
					throw `${params.fileId}`;
				}
				console.log("File updated");
			})
			.catch((error) => {
				console.error("Error updating file:", error);
				// kick user out on error eg. file stops existing
				navigate("/filebrowser");
			});
	}, [fileData?.name, fileData?.content]);

	if (!params.fileId) {
		return <div>File ID is missing</div>;
	}

	if (!fileData) {
		fetch(`/api/files/${params.fileId}`)
			.then((response) => {
				if (!response.ok) throw `${params.fileId}`;
				return response.json();
			})
			.then((data) => {
				console.log("File data:", data);
				setFileData(data);
			})
			.catch((error) => {
				console.error("Error fetching file:", error);
				// kick user out on error eg. file stops existing
				navigate("/filebrowser");
			});
	}

	return fileData ? (
		<>
			<label>
				{"File Name: "}
				<input
					aria-label="File name"
					type="text"
					value={fileData.name}
					onChange={(e) => setFileData({...fileData, name: e.target.value})}
				/>
			</label>
			<CodeEditor value={fileData.content} onChange={(value) => setFileData({...fileData, content: value})} />
		</>
	) : (
		<div>Loading...</div>
	);
}

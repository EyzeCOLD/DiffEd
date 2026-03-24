import CodeEditor from "./CodeEditor";
import {useParams} from "react-router";
import type {UserFile} from "#shared/src/types";
import {useEffect, useState} from "react";

export default function EditorPage() {
	const [fileData, setFileData] = useState<UserFile | null>(null);
	const params = useParams();

	useEffect(() => {
		if (!fileData) return;
		fetch(`/api/files/${params.fileId}`, {
			method: "PUT",
			body: JSON.stringify(fileData),
			headers: [["Content-Type", "application/json"] as [string, string]],
		} satisfies RequestInit)
			.then(() => console.log("File updated"))
			.catch((error) => console.error("Error updating file:", error));
	}, [fileData?.name, fileData?.content]);

	if (!params.fileId) {
		return <div>File ID is missing</div>;
	}

	if (!fileData) {
		fetch(`/api/files/${params.fileId}`)
			.then((response) => {
				if (!response.ok) {
					const file: UserFile = {id: Number(params.fileId), name: "editedFile", content: "initial content"};
					fetch("/api/files", {
						method: "POST",
						body: JSON.stringify(file),
						headers: [["Content-Type", "application/json"] as [string, string]],
					} satisfies RequestInit).then(() => console.log("File created"));
				}
				return response.json();
			})
			.then((data) => {
				console.log("File data:", data);
				setFileData(data);
			})
			.catch((error) => {
				console.error("Error fetching file:", error);
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

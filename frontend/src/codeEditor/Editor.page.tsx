import CodeEditor from "./CodeEditor";
import {useNavigate, useParams} from "react-router";
import type {UserFile} from "#shared/src/types";
import {useEffect, useMemo, useState} from "react";
import {CollabConnection, pushFileName} from "./collabClient";
import {Input} from "#/src/components/Input";

export default function EditorPage() {
	const [fileData, setFileData] = useState<UserFile | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const navigate = useNavigate();
	const params = useParams();
	const fileId = params.fileId;
	const connection = useMemo(() => (fileId ? new CollabConnection(fileId) : null), [fileId]);

	function setFileName(name: string) {
		setFileData((previous) => (previous ? {...previous, name} : previous));
	}

	useEffect(() => {
		fetch(`/api/files/${params.fileId}`)
			.then((response) => {
				if (!response.ok) throw `${params.fileId}`;
				return response.json();
			})
			.then((data) => {
				setFileData(data);
			})
			.catch((error) => {
				console.error("Error fetching file:", error);
				// kick user out on error eg. file stops existing
				navigate("/filebrowser");
			});
	}, [params.fileId]);

	useEffect(() => {
		return function cleanup() {
			connection?.disconnect();
		};
	}, [connection]);

	if (!params.fileId) {
		return <div>File ID is missing</div>;
	}

	return fileData && fileId && connection ? (
		<>
			<label>
				{"File Name: "}
				<Input
					aria-label="File name"
					type="text"
					value={fileData.name}
					onChange={async (e) => {
						const nextName = e.target.value;
						setFileName(nextName);

						try {
							const updated = await pushFileName(connection, nextName);
							if ("error" in updated) {
								setErrorMessage(`Failed to update file name: ${updated.error}`);
								return;
							}
						} catch (error) {
							console.error("Failed to push file name:", error);
						}
					}}
				/>
			</label>
			{errorMessage && <div className="text-red-500">{errorMessage}</div>}
			<CodeEditor
				fileId={fileId}
				connection={connection}
				onChange={(value) => setFileData({...fileData, content: value})}
			/>
		</>
	) : (
		<div>Loading...</div>
	);
}

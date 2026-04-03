import CodeEditor from "./CodeEditor";
import {useNavigate, useParams} from "react-router";
import type {UserFile} from "#shared/src/types";
import {useEffect, useRef, useState} from "react";
import {CollabConnection, pushFileName} from "./collabClient";
import styles from "./editor.page.module.css";

export default function EditorPage() {
	const [fileData, setFileData] = useState<UserFile | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const navigate = useNavigate();
	const params = useParams();
	const fileId = params.fileId;
	const nameConnectionRef = useRef<CollabConnection | null>(null);

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
		if (!fileId) {
			return;
		}

		const connection = new CollabConnection(fileId);
		nameConnectionRef.current = connection;

		return () => {
			connection.disconnect();
			if (nameConnectionRef.current === connection) {
				nameConnectionRef.current = null;
			}
		};
	}, [fileId]);

	if (!params.fileId) {
		return <div>File ID is missing</div>;
	}

	return fileData && fileId ? (
		<>
			<label>
				{"File Name: "}
				<input
					aria-label="File name"
					type="text"
					value={fileData.name}
					onChange={async (e) => {
						const nextName = e.target.value;
						setFileName(nextName);

						const connection = nameConnectionRef.current;
						if (!connection) return;

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
			{errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
			<CodeEditor fileId={fileId} onChange={(value) => setFileData({...fileData, content: value})} />
		</>
	) : (
		<div>Loading...</div>
	);
}

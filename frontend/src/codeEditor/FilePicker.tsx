import {useEffect, useState} from "react";
import type {JSX} from "react";
import type {UserFile} from "#shared/src/types";
import {CollabConnection, pickFile} from "./collabClient";
import {apiFetch} from "../utils";
import FileBrowser from "../fileBrowser/FileBrowser";

type FilePickerProps = {
	connection: CollabConnection;
};

export default function FilePicker({connection}: FilePickerProps): JSX.Element {
	const [files, setFiles] = useState<UserFile[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		apiFetch<UserFile[]>("/api/files")
			.then((response) => {
				if (cancelled) return;
				if (!response.ok) {
					setError(response.error);
					return;
				}
				setFiles(response.data);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load files");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function handlePick(fileId: string) {
		try {
			await pickFile(connection, fileId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to pick file");
		}
	}

	if (error) {
		return (
			<div className="p-4">
				<p className="text-red-500">{error}</p>
			</div>
		);
	}
	if (!files) return <p className="p-4">Loading your files...</p>;

	return (
		<div className="p-4 flex flex-col gap-2">
			<h2 className="text-lg">Pick a file to bring into this session</h2>
			<FileBrowser onFileSelect={handlePick} />
		</div>
	);
}

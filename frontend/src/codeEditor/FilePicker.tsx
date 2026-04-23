import {useEffect, useState} from "react";
import type {JSX} from "react";
import type {UserFile} from "#shared/src/types";
import {CollabConnection, pickFile} from "./collabClient";
import {Button} from "../components/Button";
import {apiFetch} from "../utils";

type FilePickerProps = {
	connection: CollabConnection;
	onPicked: () => void;
};

export default function FilePicker({connection, onPicked}: FilePickerProps): JSX.Element {
	const [files, setFiles] = useState<UserFile[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pickingId, setPickingId] = useState<string | null>(null);

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

	async function handlePick(file: UserFile) {
		setError(null);
		setPickingId(file.id);
		try {
			await pickFile(connection, file.id);
			onPicked();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to pick file");
		} finally {
			setPickingId(null);
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
	if (files.length === 0) return <p className="p-4">You have no files to bring into this session.</p>;

	return (
		<div className="p-4 flex flex-col gap-2">
			<h2 className="text-lg">Pick a file to bring into this session</h2>
			<ul className="flex flex-col gap-1">
				{files.map((file) => (
					<li key={file.id}>
						<Button onClick={() => handlePick(file)} disabled={pickingId !== null}>
							🗎 {file.name}
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}

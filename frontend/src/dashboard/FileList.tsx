import type {UserFile} from "#shared/src/types";
import {Link} from "react-router";
import type {JSX} from "react";
import {Button} from "../components/Button";

function FileList({
	fileList,
	refreshFileList,
}: {
	fileList: UserFile[] | null;
	refreshFileList: () => void;
}): JSX.Element {
	if (!fileList) return <p>Loading really slow...</p>;
	if (fileList.length === 0) return <p>You lead a fileless existence.</p>;

	async function handleDownload(file: UserFile) {
		const res = await fetch(`/api/download/${file.id}`);
		// This whole function could just be a link, but if we do auth with
		// tokens, apparently this workaround is necessary to be able to check
		// the header as per Claude
		//
		// const res = await fetch(`/api/download/${id}`, {
		// 	headers: {Authorization: `Bearer ${token}`},
		// });

		const blob = await res.blob();
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = file.name;
		a.click();

		URL.revokeObjectURL(url);
	}

	async function handleDelete(id: string) {
		if (!window.confirm("Are you sure you want to delete this file?")) return;
		try {
			const result = await fetch(`/api/files/${id}`, {
				method: "DELETE",
			});
			if (!result.ok) {
				console.error("something wrong :(");
				return;
			}
			refreshFileList();
			console.log("Delete succesful");
		} catch (error) {
			console.error(error);
		}
	}

	const listItems: JSX.Element[] = fileList.map<JSX.Element>((file: UserFile) => {
		return (
			<tr key={file.id}>
				<td>
					<Link to={`/edit/${file.id}`}>🗎 {file.name}</Link>
				</td>
				<td className="text-center">
					<Button onClick={() => handleDownload(file)}> 🡻 </Button>
				</td>
				<td className="text-center">
					<Button onClick={() => handleDelete(file.id)}> ☒ </Button>
				</td>
			</tr>
		);
	});

	return (
		<table id="file list">
			<thead>
				<th>filename</th>
				<th>download</th>
				<th>delete</th>
			</thead>
			<tbody>{listItems}</tbody>
		</table>
	);
}

export default FileList;

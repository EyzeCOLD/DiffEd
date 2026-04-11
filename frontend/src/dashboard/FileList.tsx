import type {UserFile} from "#shared/src/types";
import {Link} from "react-router";
import type {JSX} from "react";
import {Button} from "../components/Button";
import {UserFileSchema} from "#shared/src/schemas";
function FileList({
	fileList,
	refreshFileList,
}: {
	fileList: UserFile[] | null;
	refreshFileList: () => void;
}): JSX.Element {
	if (!fileList) return <p>Loading really slow...</p>;
	if (fileList.length === 0) return <p>You lead a fileless existence.</p>;

	// just tested how would it look like if there was no explicit file download endpoint,
	//  and if the content was locally available how would it work to not even fetch anything
	async function handleDownload(file: UserFile) {
		console.log(file);
		if (file.content === null || file.content === undefined) {
			const res = await fetch(`/api/files/${file.id}`);

			const jsonData = await res.json();
			const parseResult = UserFileSchema.safeParse(jsonData); // validation not really needed but wanted it for testing
			if (!parseResult.success) {
				console.error(`could not get content for file '${file.name}' id[${file.id}]`);
				return;
			}
			const newFileData: UserFile = parseResult.data;
			file.name = newFileData.name;
			file.content = newFileData.content;
		}
		// This whole function could just be a link, but if we do auth with
		// tokens, apparently this workaround is necessary to be able to check
		// the header as per Claude
		//
		// const res = await fetch(`/api/download/${id}`, {
		// 	headers: {Authorization: `Bearer ${token}`},
		// });
		const blob = new Blob([file.content]);
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

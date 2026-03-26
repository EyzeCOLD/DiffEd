import type {UserFile} from "#shared/src/types";
import {Link} from "react-router";
import type {JSX} from "react";

function FileList({
	fileList,
	refreshFileList,
}: {
	fileList: UserFile[] | null;
	refreshFileList: () => void;
}): JSX.Element {
	if (!fileList) {
		return <p>Loading really slow...</p>;
	}

	async function handleDelete(id: string) {
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
				<td>
					<button
						onClick={() => {
							handleDelete(file.id);
						}}
					>
						☒
					</button>
				</td>
			</tr>
		);
	});

	return (
		<table id="file list">
			<thead>
				<th>filename</th>
				<th>delete</th>
			</thead>
			<tbody>{listItems}</tbody>
		</table>
	);
}

export default FileList;

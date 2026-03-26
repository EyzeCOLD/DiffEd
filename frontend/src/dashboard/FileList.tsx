import type {UserFile} from "#shared/src/types";
import {Link} from "react-router";
import type {JSX} from "react";

function FileList({fileList}: {fileList: UserFile[] | null}): JSX.Element {
	if (!fileList) {
		return <p>Loading really slow...</p>;
	}

	const listItems: JSX.Element[] = fileList.map<JSX.Element>((f: UserFile) => {
		return (
			<tr key={f.id}>
				<File file={f} />
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

function File({file}: {file: UserFile}): JSX.Element {
	return (
		<>
			<td>
				<Link to={`/edit/${file.id}`}>🗎 {file.name}</Link>
			</td>
			<td>
				<button>☒</button>
			</td>
		</>
	);
}

export default FileList;

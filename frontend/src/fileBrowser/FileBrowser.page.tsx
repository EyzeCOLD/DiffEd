import FileList from "./FileList";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import type {UserFile, ApiResponse} from "#shared/src/types";
import {useState, useEffect} from "react";
import {apiFetch} from "#/src/utils";
import {useShowToast} from "#/src/stores/toastStore";

function FileBrowserPage() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);
	const showToast = useShowToast();

	async function refreshFileList() {
		const response: ApiResponse<UserFile[]> = await apiFetch("/api/files");
		if (response.ok) {
			console.log(response.data);
			setFileList(response.data);
		} else {
			console.error(response.error);
			showToast("error", `${response.error}`);
		}
	}

	// Error: Calling setState synchronously within an effect can trigger cascading renders
	// Effects are intended to synchronize state between React and external systems such
	// as manually updating the DOM, state management libraries, or other platform APIs.
	// In general, the body of an effect should do one or both of the following:
	// * Update external systems with the latest state from React.
	// * Subscribe for updates from some external system,
	// 	calling setState in a callback function when external state changes.
	// Calling setState synchronously within an effect body causes cascading renders
	// that can hurt performance, and is not recommended.
	// (https://react.dev/learn/you-might-not-need-an-effect).
	useEffect(() => void refreshFileList(), []);

	return (
		<>
			<FileList fileList={fileList} refreshFileList={refreshFileList} />
			<NewFile />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

export default FileBrowserPage;

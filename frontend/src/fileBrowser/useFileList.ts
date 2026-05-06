import type {UserFile, ApiResponse} from "#shared/src/types";
import {useState, useEffect, useMemo} from "react";
import {apiFetch} from "#/src/utils";
import {useShowToast} from "#/src/stores/toastStore";

function useFileList() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);
	const [filter, setFilter] = useState("");
	const [page, setPage] = useState(0);
	const [sortDescending, setSortDescending] = useState(true);
	const showToast = useShowToast();
	const FILES_PER_PAGE = 10;

	const processed = useMemo(() => {
		if (!fileList) return [];
		return fileList
			.filter((f) => f.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
			.sort((a, b) => a.name.localeCompare(b.name) * (sortDescending ? 1 : -1));
	}, [fileList, filter, sortDescending]);

	async function refreshFileList() {
		const response: ApiResponse<UserFile[]> = await apiFetch("/api/files");
		if (response.ok) {
			setFileList(response.data);
		} else {
			console.error(response.error);
			showToast("error", `${response.error}`);
		}
	}

	useEffect(() => void refreshFileList(), []);

	const paginated = processed.slice(page * FILES_PER_PAGE, (page + 1) * FILES_PER_PAGE);
	const totalPages = processed ? Math.ceil(processed.length / FILES_PER_PAGE) : 0;

	return {
		paginated,
		totalPages,
		page,
		setPage,
		filter,
		setFilter,
		sortDescending,
		setSortDescending,
		refreshFileList,
	};
}

export default useFileList;

import type {UserFile, ApiResponse} from "#shared/src/types";
import {useState, useEffect, useMemo, useCallback} from "react";
import {apiFetch} from "#/src/utils";
import {useShowToast} from "#/src/stores/toastStore";
import {useSearchParams} from "react-router";

const FILES_PER_PAGE = 10;

function useFileBrowser() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const showToast = useShowToast();

	const filter = searchParams.get("filter") ?? "";
	const page = Number(searchParams.get("page") ?? "1") - 1;
	const sortDescending = (searchParams.get("sort") ?? "desc") === "desc";

	function setFilter(value: string) {
		setSearchParams((prev) => {
			if (value) prev.set("filter", value);
			else prev.delete("filter");
			prev.set("page", "1");
			return prev;
		});
	}

	function setPage(value: number) {
		setSearchParams((prev) => {
			prev.set("page", String(value + 1));
			return prev;
		});
	}

	function toggleSort() {
		setSearchParams((prev) => {
			prev.set("sort", sortDescending ? "asc" : "desc");
			prev.set("page", "1");
			return prev;
		});
	}
	const processed = useMemo<UserFile[]>(() => {
		if (!fileList) return [];
		return fileList
			.filter((f) => f.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
			.sort((a, b) => a.name.localeCompare(b.name) * (sortDescending ? 1 : -1));
	}, [fileList, filter, sortDescending]);

	const refreshFileList = useCallback(async () => {
		const response: ApiResponse<UserFile[]> = await apiFetch("/api/files");
		if (response.ok) {
			setFileList(response.data);
		} else {
			console.error(response.error);
			showToast("error", `${response.error}`);
		}
	}, [showToast]);

	useEffect(() => void refreshFileList(), []);

	const totalFiles = fileList ? fileList.length : 0;
	const paginated = processed.slice(page * FILES_PER_PAGE, (page + 1) * FILES_PER_PAGE);
	const totalPages = Math.ceil(processed.length / FILES_PER_PAGE);

	return {
		paginated,
		totalPages,
		page,
		setPage,
		filter,
		setFilter,
		sortDescending,
		toggleSort,
		refreshFileList,
		totalFiles,
	};
}

export default useFileBrowser;

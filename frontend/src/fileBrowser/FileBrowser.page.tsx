import FileList from "./FileList";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import type {UserFile, ApiResponse} from "#shared/src/types";
import {useState, useEffect, useMemo} from "react";
import {apiFetch} from "#/src/utils";
import {useShowToast} from "#/src/stores/toastStore";
import {Input} from "#/src/components/Input";
import {Button} from "#/src/components/Button";

function FileBrowserPage() {
	const [fileList, setFileList] = useState<UserFile[] | null>(null);
	const showToast = useShowToast();
	const [filter, setFilter] = useState("");
	const [sortDescending, setSortDescending] = useState(true);
	const [page, setPage] = useState(0);
	const FILES_PER_PAGE = 10;

	const processed = useMemo(() => {
		if (!fileList) return [];
		return fileList
			.filter((f) => f.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
			.sort((a, b) => a.name.localeCompare(b.name) * (sortDescending ? 1 : -1));
	}, [fileList, filter, sortDescending]);

	const paginated = processed.slice(page * FILES_PER_PAGE, (page + 1) * FILES_PER_PAGE);
	const totalPages = processed ? Math.ceil(processed.length / FILES_PER_PAGE) : 0;

	async function refreshFileList() {
		const response: ApiResponse<UserFile[]> = await apiFetch("/api/files");
		if (response.ok) {
			setFileList(response.data);
		} else {
			console.error(response.error);
			showToast("error", `${response.error}`);
		}
	}

	// @NOTE this is fine
	useEffect(() => void refreshFileList(), []);

	return (
		<>
			<div>
				<Input
					type="text"
					id="fileListFilter"
					value={filter}
					placeholder="Filter"
					onChange={(event) => setFilter(event.target.value)}
				/>
			</div>
			<div>
				<Button onClick={() => setSortDescending((s) => !s)}>Toggle sort direction</Button>
			</div>
			<FileList
				fileList={paginated}
				refreshFileList={refreshFileList}
				onSortChange={setSortDescending}
				descending={sortDescending}
			/>
			{totalPages ? <Paginator currentPage={page} totalPages={totalPages} onPageChange={setPage} /> : null}
			<NewFile />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

type paginatorProps = {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

function Paginator({currentPage, totalPages, onPageChange}: paginatorProps) {
	function generatePageNumbers() {
		if (totalPages <= 7) {
			return Array.from({length: totalPages}, (_, i) => i + 1);
		}

		const pages: (number | "...")[] = [1];
		if (currentPage > 2) pages.push("...");
		for (let i = Math.max(2, currentPage); i <= Math.min(totalPages - 1, currentPage + 2); ++i) {
			pages.push(i);
		}
		if (currentPage < totalPages - 2) pages.push("...");
		pages.push(totalPages);
		return pages;
	}

	const pageNumbers = generatePageNumbers();

	return (
		<div>
			<Button onClick={() => onPageChange(Math.max(0, currentPage - 1))}>«</Button>
			{pageNumbers.map((p) => {
				if (p === "...") {
					return <Button>{p}</Button>;
				} else if (p === currentPage + 1) {
					return <Button className="underline underline-offset-2 font-bold">{p}</Button>;
				}
				return <Button onClick={() => onPageChange(p - 1)}>{p}</Button>;
			})}
			<Button onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}>»</Button>
			Page {currentPage + 1} out of {totalPages}
		</div>
	);
}

export default FileBrowserPage;

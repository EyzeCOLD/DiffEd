import FileList from "./FileList";
import Paginator from "./Paginator";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import useFileList from "./useFileList";
import {Input} from "#/src/components/Input";

type fileBrowserProps = {
	onFileSelect: (fileId: string) => void;
};

function FileBrowser({onFileSelect}: fileBrowserProps) {
	const {
		paginated,
		totalPages,
		page,
		setPage,
		filter,
		setFilter,
		sortDescending,
		setSortDescending,
		refreshFileList,
		totalFiles,
	} = useFileList();

	return (
		<>
			{totalFiles > 0 ? (
				<div>
					<Input
						type="text"
						id="fileListFilter"
						value={filter}
						placeholder="Filter"
						onChange={(event) => setFilter(event.target.value)}
					/>
				</div>
			) : null}
			<FileList
				onFileSelect={onFileSelect}
				fileList={paginated}
				refreshFileList={refreshFileList}
				onSortToggle={() => setSortDescending((d) => !d)}
				descending={sortDescending}
			/>
			{totalPages ? <Paginator currentPage={page} totalPages={totalPages} onPageChange={setPage} /> : null}
			<NewFile onFileSelect={onFileSelect} />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

export default FileBrowser;

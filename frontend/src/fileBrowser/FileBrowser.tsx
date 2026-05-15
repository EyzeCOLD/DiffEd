import FileList from "./FileList";
import PageSelector from "./PageSelector";
import NewFile from "./NewFile";
import FileUploader from "./FileUploader";
import useFileBrowser from "./useFileBrowser";
import Input from "#/src/components/Input";

type fileBrowserProps = {
	onFileSelect: (fileId: string) => Promise<void>;
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
		toggleSort,
		refreshFileList,
		pushToFileList,
		totalFiles,
	} = useFileBrowser();

	return (
		<div className="flex flex-col center-items justify-center">
			{totalFiles > 0 ? (
				<label>
					Filter:
					<Input type="text" id="fileListFilter" value={filter} onChange={(event) => setFilter(event.target.value)} />
				</label>
			) : null}
			<FileList
				onFileSelect={onFileSelect}
				fileList={paginated}
				refreshFileList={refreshFileList}
				onSortToggle={toggleSort}
				descending={sortDescending}
			/>
			{totalPages ? <PageSelector currentPage={page} totalPages={totalPages} onPageChange={setPage} /> : null}
			<NewFile onFileCreate={onFileSelect} refreshFileList={refreshFileList} />
			<FileUploader pushToFileList={pushToFileList} refreshFileList={refreshFileList} />
		</div>
	);
}

export default FileBrowser;

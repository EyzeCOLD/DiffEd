import FileList from "./FileList";
import PageSelector from "./PageSelector";
import NewFile from "./NewFile";
import FileUploader from "./FileUpload";
import useFileBrowser from "./useFileBrowser";
import Input from "#/src/components/Input";

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
	} = useFileBrowser();

	return (
		<>
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
				onSortToggle={() => setSortDescending((d) => !d)}
				descending={sortDescending}
			/>
			{totalPages ? <PageSelector currentPage={page} totalPages={totalPages} onPageChange={setPage} /> : null}
			<NewFile onFileCreate={onFileSelect} />
			<FileUploader refreshFileList={refreshFileList} />
		</>
	);
}

export default FileBrowser;

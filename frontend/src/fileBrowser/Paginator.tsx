import {Button} from "#/src/components/Button";

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

export default Paginator;

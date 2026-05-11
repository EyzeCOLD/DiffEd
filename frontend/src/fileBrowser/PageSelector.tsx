import Button from "#/src/components/Button";

type pageSelectorProps = {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

function PageSelector({currentPage, totalPages, onPageChange}: pageSelectorProps) {
	if (totalPages < 2) return null;

	function generatePageNumbers() {
		if (totalPages <= 7) {
			return Array.from({length: totalPages}, (_, i) => i + 1);
		}

		const pages: (number | "...")[] = [1];
		if (currentPage > 3) pages.push("...");
		for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 3); ++i) {
			pages.push(i);
		}
		if (currentPage < totalPages - 4) pages.push("...");
		pages.push(totalPages);
		return pages;
	}

	const pageNumbers = generatePageNumbers();

	return (
		<nav aria-label="Pagination">
			<ul className="flex list-none p-0 m-0">
				<li key="Previous page">
					<Button
						aria-label="Previous page"
						onClick={() => onPageChange(Math.max(0, currentPage - 1))}
						disabled={currentPage === 0 || undefined}
					>
						<span aria-hidden="true">{"«"}</span>
					</Button>
				</li>
				{pageNumbers.map((p, i) => {
					if (p === "...") {
						return (
							<li key={i}>
								<span role="img" aria-label="More pages">
									<span aria-hidden="true">...</span>
								</span>
							</li>
						);
					} else if (p === currentPage + 1) {
						return (
							<li key={i}>
								<Button aria-current="page">{p}</Button>
							</li>
						);
					}
					return (
						<li key={i}>
							<Button onClick={() => onPageChange(p - 1)}>{p}</Button>
						</li>
					);
				})}
				<li key="Next page">
					<Button
						aria-label="Next page"
						onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
						disabled={currentPage === totalPages - 1 || undefined}
					>
						<span aria-hidden="true">{"»"}</span>
					</Button>
				</li>
			</ul>
		</nav>
	);
}

export default PageSelector;

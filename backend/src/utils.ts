// Returns true if the error looks like a database error
export function isDbError(error: unknown): error is {code: string; detail?: string; constraint?: string} {
	return typeof error === "object" && error !== null && "code" in error;
}

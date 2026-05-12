import type {ApiResponse} from "#shared/src/types.js";

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wrapper for fetch() that handles all the weird cases when we don't get out
// own beautiful ApiResponse from the server
export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<ApiResponse<T>> {
	let res: globalThis.Response;

	try {
		res = await fetch(input, init);
	} catch {
		return {ok: false, error: "Network error"};
	}

	try {
		const json = await res.json();

		if (typeof json !== "object" || json === null || typeof json.ok !== "boolean") {
			return {ok: false, error: "Malformed response"};
		}

		return json as ApiResponse<T>;
	} catch {
		return {ok: false, error: `Unexpected response (${res.status})`};
	}
}

export async function getSession(): Promise<boolean> {
	const res: ApiResponse<boolean> = await apiFetch("/api/session", {
		method: "GET",
		credentials: "include",
	});

	return res.ok;
}

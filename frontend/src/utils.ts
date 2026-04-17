import type {ApiResponse} from "#shared/src/types.js";

export async function getSession(): Promise<boolean> {
	try {
		const res = await fetch("/api/session", {
			method: "GET",
			credentials: "include",
		});
		return res.ok;
	} catch (err) {
		console.error("Error:", err);
		return false;
	}
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

	if (res.status === 401) {
		return {ok: false, error: "Unauthorized"};
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

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

// Handles all the weird cases when we don't get out own beautiful ApiResponse from the server
export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<ApiResponse<T>> {
	let res: globalThis.Response;

	try {
		res = await fetch(input, init);
	} catch {
		throw new Error("Network error");
	}

	if (res.status === 401) {
		window.location.href = "/login";
		throw new Error("Unauthorized");
	}

	try {
		return (await res.json()) as ApiResponse<T>;
	} catch {
		throw new Error(`Unexpected response (${res.status})`);
	}
}

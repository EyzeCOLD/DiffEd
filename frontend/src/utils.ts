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

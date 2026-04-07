
export default async function getSession(): Promise<boolean> {
    try {
        const res = await fetch("/api/session", {
            method: "GET",
            credentials: "include",
        })
        return res.ok; 
    } catch (e) {
        console.error("Error:", e);
        return false;
    }
}


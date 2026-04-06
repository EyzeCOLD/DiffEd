import { useEffect, useState } from "react";

export default function useAuthCheck() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("api/auth/check", { credentials: "include" })
            .then((res) => {
                setIsAuthenticated(res.ok);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Auth check failed:", err);
                setIsLoading(false);
            });
    }, []);

    return { isLoading, isAuthenticated };
}

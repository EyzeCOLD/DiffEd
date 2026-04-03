import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function Dasboard() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard", {
            credentials: "include", //send session cookie
        })
            .then((res) => {
                if(!res.ok) {
                    navigate("/login");
                } else {
                    setIsLoading(false);
                }
            })
            .catch(() => navigate("/login"));
    }, [navigate]);

    return (isLoading ? (
        <div>Loading...</div>
    ) : (
        <div>Welcome to Dashboard!</div>
    ));
}

import {useState, useEffect, useCallback} from "react";
import {useNavigate} from "react-router";

export type User = {
	id: number;
	username: string;
	email: string;
};

export type AuthResponse = {
	message: string;
	user?: User;
	error?: string;
};

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
export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const checkAuth = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/session", {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Not Authenticated");
			}

			const data = await response.json();
			if (data.user) {
				setUser(data.user);
			} else {
				setUser(null);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, [navigate]);

	const login = useCallback(
		async (identifier: string, password: string) => {
			setLoading(true);
			setError(null);
			try {
				const isEmail = identifier.includes("@");
				const body = isEmail
					? JSON.stringify({email: identifier, password})
					: JSON.stringify({username: identifier, password});

				const response = await fetch("/api/session", {
					method: "POST",
					headers: {
						"Contenty-Type": "application/json",
					},
					body: body,
					credentials: "include",
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Login failed");
				}

				const data: AuthResponse = await response.json();
				setUser(data.user || null);
				navigate("/dashboard");
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
				setUser(null);
			} finally {
				setLoading(false);
			}
		},
		[navigate],
	);

	const loginWithGoogle = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/auth/google");
			if (!response.ok) {
				throw new Error("Failed to get Google auth URL");
			}

			const {url} = await response.json();

			const currentPath = window.location.pathname;
			localStorage.setItem("redirectAfterLogin", currentPath);

			window.location.href = url;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Google login failed");
		} finally {
			setLoading(false);
		}
	}, []);

	const handleGoogleCallback = useCallback(async (code: string, state: string) => {
		setLoading(true);
		setError(null);
		try {
			await checkAuth();

			const redirectPath = localStorage.getItem("redirectAfterLogin") || "/dashboard";
			localStorage.removeItem("redirectAfterLogin");
			navigate(redirectPath);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Google login failed");
		} finally {
			setLoading(false);
		}
	});

	const register = useCallback(
		async (username: string, email: string, password: string) => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch("/api/users", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({username, email, password}),
					credentials: "include",
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Registration failed");
				}

				const data: AuthResponse = await response.json();
				setUser(data.user || null);
				navigate("/dashboard"); // Frontend handles redirect
			} catch (err) {
				setError(err instanceof Error ? err.message : "Registration failed");
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[navigate],
	);

	const logout = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/session", {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Logout failed");
			}

			setUser(null);
			navigate("/login"); // Frontend handles redirect
		} catch (err) {
			setError(err instanceof Error ? err.message : "Logout failed");
		} finally {
			setLoading(false);
		}
	}, [navigate]);

	// Check for Google OAuth callback in URL
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const state = params.get("state");

		if (code && state) {
			// Clean the URL
			window.history.replaceState({}, document.title, window.location.pathname);

			// Handle the callback
			handleGoogleCallback(code, state);
		} else {
			checkAuth();
		}
	}, [checkAuth, handleGoogleCallback, navigate]);
	return {
		user,
		loading,
		error,
		checkAuth,
		loginWithGoogle,
		login,
		register,
		logout,
	};
}

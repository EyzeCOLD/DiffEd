import {useNavigate} from "react-router";
import Button from "./components/Button";
import {useCurrentUser} from "./stores/userStore";

export default function NotFoundPage() {
	const navigate = useNavigate();
	const currentUser = useCurrentUser();

	return (
		<div className="min-h-[calc(100vh-48px)] flex flex-col items-center justify-center gap-4">
			<p className="font-mono text-foreground/50 text-sm tracking-[0.35em] uppercase">404</p>
			<h1 className="font-mono font-bold text-accent text-4xl">Page not found</h1>
			{currentUser ? (
				<Button onClick={() => navigate("/filebrowser")} className="mt-2 px-5 py-1.5 text-sm">
					Go to files
				</Button>
			) : (
				<Button onClick={() => navigate("/")} className="mt-2 px-5 py-1.5 text-sm">
					Back to home
				</Button>
			)}
		</div>
	);
}

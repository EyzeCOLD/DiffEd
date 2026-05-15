import {Link} from "react-router";

export default function Footer() {
	return (
		<footer className="border-t border-foreground/10 py-4 px-8 text-xs text-foreground/40 font-mono">
			<div className="flex justify-center gap-6">
				<Link to="/terms" className="hover:text-foreground/80 transition-colors">
					Terms
				</Link>
				<Link to="/privacy" className="hover:text-foreground/80 transition-colors">
					Privacy
				</Link>
			</div>
		</footer>
	);
}

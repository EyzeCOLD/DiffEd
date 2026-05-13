export default function NotFoundPage() {
	return (
		<div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center gap-4">
			<p className="font-mono text-foreground/50 text-sm tracking-[0.35em] uppercase">404</p>
			<h1 className="font-mono font-bold text-accent text-4xl">Page not found</h1>
		</div>
	);
}

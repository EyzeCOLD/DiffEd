export default function TermsPage() {
	return (
		<div className="min-h-[calc(100vh-100px)] flex flex-col items-center px-8 py-16">
			<div className="max-w-2xl w-full">
				<p className="font-mono text-foreground/50 text-xs tracking-[0.35em] uppercase mb-3">Legal</p>
				<h1 className="font-mono font-bold text-accent text-4xl mb-10">Terms of Service</h1>

				<div className="space-y-6 text-foreground/80 text-base leading-relaxed">
					<p>
						DiffEd is a non-commercial educational project. It is provided as-is, with no warranties and no guarantee of
						uptime, data durability, or fitness for any particular purpose.
					</p>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">Your account</h2>
						<p>
							You are responsible for the content you create, store, and share through DiffEd. You can delete your
							account at any time from the account page; doing so removes your stored data.
						</p>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">Acceptable use</h2>
						<p>
							Don't use DiffEd to store or share illegal content, malware, or material intended to harm or harass other
							people. Accounts that abuse the service may be suspended or removed without notice.
						</p>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">Changes</h2>
						<p>These terms may change. Continued use of DiffEd means you accept the current terms.</p>
					</section>
				</div>
			</div>
		</div>
	);
}

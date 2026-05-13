export default function PrivacyPage() {
	return (
		<div className="min-h-[calc(100vh-100px)] flex flex-col items-center px-8 py-16">
			<div className="max-w-2xl w-full">
				<p className="font-mono text-foreground/50 text-xs tracking-[0.35em] uppercase mb-3">Legal</p>
				<h1 className="font-mono font-bold text-accent text-4xl mb-10">Privacy Policy</h1>

				<div className="space-y-6 text-foreground/80 text-base leading-relaxed">
					<p>
						DiffEd is a non-commercial educational project. We collect the minimum needed to run the service and we do
						not share your data with anyone.
					</p>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">What we store</h2>
						<ul className="list-disc pl-6 space-y-1">
							<li>Your username and email.</li>
							<li>Your password, hashed. We never see or store the plaintext.</li>
							<li>Your Vim-bindings preference.</li>
							<li>Your GitHub ID, only if you choose to link a GitHub account.</li>
							<li>The files you create and edit.</li>
						</ul>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">What we don't do</h2>
						<ul className="list-disc pl-6 space-y-1">
							<li>No analytics, tracking, or advertising.</li>
							<li>No selling, renting, or sharing data with third parties.</li>
							<li>No marketing or notification emails. We don't send email at all.</li>
						</ul>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">Cookies</h2>
						<p>We set one cookie to keep you signed in. It's HTTP-only and expires after 24 hours.</p>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">GitHub login</h2>
						<p>
							If you link a GitHub account, we receive your GitHub user ID and email address, but store only the ID.
							That public identifier is what lets us recognize you on your next login.
						</p>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">Collaboration</h2>
						<p>
							Real-time edits in a shared workspace are processed in memory. Only the resulting file contents are saved
							- no file history is recorded.
						</p>
						<p className="mt-3">
							Anyone in your workspace can see your username and the live contents of any file you have open there. The
							workspace link is the only thing controlling access - it's almost unguessable, and anyone you share it
							with can join.
						</p>
					</section>

					<section>
						<h2 className="font-mono text-accent/90 text-lg mb-2">Deletion</h2>
						<p>
							Deleting your account from the account page removes your data from our database. There is no commercial
							processor or backup service behind DiffEd holding a copy.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}

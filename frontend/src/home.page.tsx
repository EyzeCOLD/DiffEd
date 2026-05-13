import {useCurrentUser} from "./stores/userStore";
import {useNavigate} from "react-router";
import Button from "./components/Button";

export default function HomePage() {
	const currentUser = useCurrentUser();
	const navigate = useNavigate();

	return (
		<>
			<style>{`
				@keyframes title-pulse {
					0%, 100% { text-shadow: 0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent); }
					50%       { text-shadow: 0 0 60px color-mix(in srgb, var(--color-accent) 55%, transparent), 0 0 100px color-mix(in srgb, var(--color-accent) 15%, transparent); }
				}
				@keyframes rise {
					from { opacity: 0; transform: translateY(18px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				.home-title { animation: title-pulse 7s ease-in-out infinite, rise 0.65s ease-out both; }
				.home-sub   { animation: rise 0.65s ease-out 0.2s both; }
				.home-cta   { animation: rise 0.65s ease-out 0.38s both; }
			`}</style>

			<div className="min-h-[calc(100vh-48px)] flex flex-col items-center justify-center px-8">
				<div className="text-center max-w-lg">
					<p className="home-sub text-foreground/50 font-mono text-xs tracking-[0.35em] uppercase mb-5 select-none">
						collaborative code editor
					</p>

					<h1 className="home-title font-mono font-bold text-accent tracking-wide mb-6 text-[clamp(4rem,14vw,8rem)] leading-[1.05]">
						DiffEd
					</h1>

					<div className="mb-10 h-px w-16 mx-auto bg-accent/25" />

					<p className="home-sub text-foreground/70 text-base mb-10 leading-relaxed">
						Write and edit code together,&nbsp;in real&nbsp;time.
					</p>

					<div className="home-cta flex gap-3 justify-center">
						{currentUser ? (
							<Button onClick={() => navigate("/filebrowser")} className="px-5 py-1.5 text-sm">
								Open Files
							</Button>
						) : (
							<>
								<Button onClick={() => navigate("/login")} className="px-5 py-1.5 text-sm">
									Log In
								</Button>
								<Button onClick={() => navigate("/signup")} className="px-5 py-1.5 text-sm">
									Sign Up
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

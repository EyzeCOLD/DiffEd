import {useCallback, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {useToastStore} from "../stores/toastStore.ts";

const MIN_TOAST_MS = 4000;
const MS_PER_CHAR = 50;

function toastDuration(message: string): number {
	return Math.max(MIN_TOAST_MS, message.length * MS_PER_CHAR);
}
// WCAG 1.4.1 (A) / 1.3.1 (A): variant conveyed by icon + sr-only text, not colour alone
const ICONS = {error: "⊘", success: "✓", info: "ℹ"} as const;

const TOAST_COLOR_CLASSES: Record<"error" | "success" | "info", string> = {
	error: "bg-error border-error-accent text-white",
	success: "bg-success border-success-accent text-white",
	info: "bg-surface border-accent text-white",
};

function ToastItem({toast}: {toast: {id: number; message: string; variant: "error" | "success" | "info"}}) {
	const dismiss = useToastStore((s) => s.dismiss);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const remainingRef = useRef(toastDuration(toast.message));
	const startTimeRef = useRef(0);

	useEffect(() => {
		startTimeRef.current = Date.now();
		timerRef.current = setTimeout(() => dismiss(toast.variant, toast.id), remainingRef.current);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [toast.variant, toast.id, dismiss]);

	// WCAG 2.2.1 (A): suspend auto-dismiss while pointer is over the toast or focus is within it
	const pauseTimer = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startTimeRef.current));
	}, []);

	const resumeTimer = useCallback(() => {
		startTimeRef.current = Date.now();
		timerRef.current = setTimeout(() => dismiss(toast.variant, toast.id), remainingRef.current);
	}, [toast.variant, toast.id, dismiss]);

	return (
		<div
			// WCAG 1.4.10 (AA): max-w-sm + w-full + wrap-break-words allows reflow at 320 CSS px (400% zoom)
			className={`${TOAST_COLOR_CLASSES[toast.variant]} flex items-center gap-2 min-w-70 max-w-sm w-full rounded border px-4 py-3 shadow-lg`}
			onMouseEnter={pauseTimer}
			onMouseLeave={resumeTimer}
			onFocus={pauseTimer}
			onBlur={resumeTimer}
		>
			{/* WCAG 1.3.1 (A) / 4.1.2 (A): decorative icon hidden from AT */}
			<span aria-hidden="true" className="shrink-0 text-base leading-none">
				{ICONS[toast.variant]}
			</span>
			{/* WCAG 1.3.1 (A): variant announced as text so it isn't colour-only */}
			<span className="sr-only">{toast.variant}: </span>
			<p className="flex-1 text-sm leading-snug wrap-break-words">{toast.message}</p>
			<button
				type="button"
				// WCAG 2.5.3 (AA) / 4.1.2 (A): accessible name on an icon-only button
				aria-label="Dismiss notification"
				// WCAG 2.1.1 (A): button is keyboard operable
				onClick={() => dismiss(toast.variant, toast.id)}
				// WCAG 2.4.7 (AA) / 1.4.11 (AA): visible focus ring with ≥3:1 contrast against background
				className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white cursor-pointer"
			>
				<span aria-hidden="true" className="text-base leading-none">
					✕
				</span>
			</button>
		</div>
	);
}

export function ToastContainer() {
	const politeToasts = useToastStore((s) => s.politeToasts);
	const assertiveToasts = useToastStore((s) => s.assertiveToasts);
	const toasts = [...assertiveToasts, ...politeToasts];
	const dismiss = useToastStore((s) => s.dismiss);

	// WCAG 2.1.1 (A): Escape dismisses the most recent toast without requiring focus on it
	useEffect(() => {
		if (toasts.length === 0) return;
		function handleKeyDown(e: KeyboardEvent) {
			const latestToast = toasts[toasts.length - 1];
			if (e.key === "Escape") dismiss(latestToast.variant, latestToast.id);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toasts, dismiss]);

	// Portals always render — the live regions must exist in the DOM before any toast appears so screen readers pre-register them.
	// Never return null in here.
	return createPortal(
		<>
			{/*
			 * WCAG 4.1.3 (AA): persistent aria-live regions pre-registered in the DOM.
			 * assertive for errors (interrupts), polite for success/info (waits for idle).
			 * aria-atomic="false" announces only newly added children, not the full list.
			 */}
			<div role="alert" aria-live="assertive" aria-atomic="false" className="sr-only">
				{toasts
					.filter((t) => t.variant === "error")
					.map((t) => (
						<span key={t.id}>
							{t.variant}: {t.message}
						</span>
					))}
			</div>
			<div role="status" aria-live="polite" aria-atomic="false" className="sr-only">
				{toasts
					.filter((t) => t.variant !== "error")
					.map((t) => (
						<span key={t.id}>
							{t.variant}: {t.message}
						</span>
					))}
			</div>
			{/* WCAG 4.1.2 (A): landmark label so AT users can navigate to notifications */}
			{toasts.length > 0 && (
				<div aria-label="Notifications" className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 items-start">
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>
			)}
		</>,
		document.body,
	);
}

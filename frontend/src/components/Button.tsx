type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	children: React.ReactNode;
};

export function Button({children, className, ...props}: ButtonProps) {
	return (
		<button className={`bg-surface m-1 p-1 ${className ?? ""}`} {...props}>
			{children}
		</button>
	);
}

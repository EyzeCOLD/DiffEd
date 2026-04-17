import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	children: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({children, className, ...props}, ref) => {
	return (
		<button ref={ref} className={`bg-surface m-1 p-1 cursor-pointer ${className ?? ""}`} {...props}>
			{children}
		</button>
	);
});

Button.displayName = "Button";

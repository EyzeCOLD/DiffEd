import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	children: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({children, className, disabled, ...props}, ref) => {
		if (disabled === true) {
			return (
				<button ref={ref} className={`bg-gray-700 text-stone-500 m-1 p-1 ${className ?? ""}`}>
					{children}
				</button>
			);
		}

		return (
			<button ref={ref} className={`bg-surface m-1 p-1 hover:text-accent cursor-pointer ${className ?? ""}`} {...props}>
				{children}
			</button>
		);
	},
);

Button.displayName = "Button";

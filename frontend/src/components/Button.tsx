import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const disabledStyle = "bg-surface-dark text-foreground";
const enabledStyle = "bg-surface text-foreground-light hover:text-accent cursor-pointer";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({children, className, disabled, ...props}, ref) => {
	function getStyle() {
		if (disabled || props["aria-current"]) return disabledStyle;
		return enabledStyle;
	}

	return (
		<button ref={ref} className={`${getStyle()} m-1 p-1 ${className ?? ""}`} disabled={disabled} {...props}>
			{children}
		</button>
	);
});

Button.displayName = "Button";

export default Button;

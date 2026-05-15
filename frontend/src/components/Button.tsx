import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	danger?: boolean;
};

const disabledStyle = "bg-surface-dark text-foreground";
const enabledStyle = "bg-surface text-foreground-light hover:text-accent cursor-pointer";
const dangerStyle = "bg-canvas border border-surface-dark text-red-500 hover:text-red-300 cursor-pointer";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({children, className, danger, ...props}, ref) => {
	function getStyle() {
		if (props.disabled || props["aria-current"]) return disabledStyle;
		if (danger) return dangerStyle;
		return enabledStyle;
	}

	return (
		<button ref={ref} className={`${getStyle()} rounded-sm m-1 p-1 ${className ?? ""}`} {...props}>
			{children}
		</button>
	);
});

Button.displayName = "Button";

export default Button;

import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({className, ...props}, ref) => {
	return <input ref={ref} className={`m-1 px-1 border-2 border-surface ${className ?? ""}`} {...props} />;
});

Input.displayName = "Input";

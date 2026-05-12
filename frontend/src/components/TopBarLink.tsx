import React from "react";
import {NavLink, type NavLinkProps} from "react-router";

const TopBarLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(({children, className, ...props}, ref) => {
	return (
		<NavLink
			ref={ref}
			className={({isActive}) =>
				`text-foreground-light px-3 py-2 hover:text-accent ${isActive ? "underline underline-offset-4 font-bold" : ""} ${className ?? ""}`
			}
			{...props}
		>
			{children}
		</NavLink>
	);
});

TopBarLink.displayName = "TopBarLink";

export default TopBarLink;

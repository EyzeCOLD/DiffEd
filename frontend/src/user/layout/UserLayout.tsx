import {Outlet, useNavigate} from "react-router";
import {useEffect} from "react";
import {getSession} from "../../utils";
import TopBar from "./TopBar";

export default function UserLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		getSession().then((isLoggedIn) => {
			if (!isLoggedIn) navigate("/login");
		});
	}, []);

	return (
		<>
			<TopBar />
			<Outlet />
		</>
	);
}

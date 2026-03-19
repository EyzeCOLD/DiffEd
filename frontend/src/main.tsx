import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Login from "./user/Login.page.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Login />
		<App />
	</StrictMode>,
);

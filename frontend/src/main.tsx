import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, Routes, Route} from "react-router";
import "./index.css";
import App from "./App.tsx";
import Login from "./user/login.page.tsx";
import Signup from "./user/signup.page.tsx";

import EditorPage from "./codeEditor/editor.page.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/edit/:fileId" element={<EditorPage />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);

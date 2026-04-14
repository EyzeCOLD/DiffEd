import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, Routes, Route} from "react-router";
import "./index.css";
import App from "./App.tsx";
import LoginPage from "./user/login.page.tsx";
import SignupPage from "./user/signup.page.tsx";
import EditorPage from "./codeEditor/Editor.page.tsx";
import FileBrowserPage from "./dashboard/FileBrowser.page.tsx";
import Dashboard from "./user/dashboard.page.tsx";
import UserLayout from "./user/layout/UserLayout.tsx";
import {ToastContainer} from "./components/Toast.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ToastContainer />
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/signup" element={<SignupPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route element={<UserLayout />}>
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/filebrowser" element={<FileBrowserPage />} />
					<Route path="/edit/:fileId" element={<EditorPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);

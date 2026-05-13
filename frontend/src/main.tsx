import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, Routes, Route} from "react-router";
import "./index.css";
import HomePage from "./home.page.tsx";
import NotFoundPage from "./notFound.page.tsx";
import LoginPage from "./user/login.page.tsx";
import SignupPage from "./user/signup.page.tsx";
import EditorPage from "./codeEditor/Editor.page.tsx";
import FileBrowserPage from "./fileBrowser/FileBrowser.page.tsx";
import {UserLayout, PublicLayout} from "./layout/Layouts.tsx";
import UserManagementPage from "./user/userManagement.page.tsx";
import TermsPage from "./legal/terms.page.tsx";
import PrivacyPage from "./legal/privacy.page.tsx";
import {ToastContainer} from "./layout/Toast.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ToastContainer />
		<BrowserRouter>
			<Routes>
				<Route element={<UserLayout />}>
					<Route path="/filebrowser" element={<FileBrowserPage />} />
					<Route path="/collab/:workspaceId" element={<EditorPage />} />
					<Route path="/account" element={<UserManagementPage />} />
				</Route>
				<Route element={<PublicLayout />}>
					<Route path="/" element={<HomePage />} />
					<Route path="/signup" element={<SignupPage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/terms" element={<TermsPage />} />
					<Route path="/privacy" element={<PrivacyPage />} />
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);

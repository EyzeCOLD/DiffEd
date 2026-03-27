import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, Routes, Route} from "react-router";
import "./index.css";
import App from "./App.tsx";
import LoginPage from "./user/login.page.tsx";
import SignupPage from "./user/signup.page.tsx";
import EditorPage from "./codeEditor/editor.page.tsx";
import FileUploader from "./FileUpload.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/edit/:fileId" element={<EditorPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />
				<Route path="/upload" element={<FileUploader />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);

import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, Routes, Route} from "react-router";
import "./index.css";
import App from "./App.tsx";
import EditorPage from "./codeEditor/editor.page.tsx";
import FileUploader from "./FileUpload.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/edit/:fileId" element={<EditorPage />} />
				<Route path="/upload" element={<FileUploader />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);

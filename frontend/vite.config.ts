import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"#": path.resolve(__dirname, "./"),
			"#shared": path.resolve(__dirname, "../shared"),
		},
	},
	plugins: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
	],
});

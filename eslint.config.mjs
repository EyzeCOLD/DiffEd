import {defineConfig, globalIgnores} from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default defineConfig([
	globalIgnores(["**/node_modules/", "**/playwright-report/"]),
	{
		extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),

		plugins: {
			"@typescript-eslint": typescriptEslint,
			react,
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: "latest",
			sourceType: "module",
		},

		rules: {
			"no-mixed-spaces-and-tabs": "off", // prettier mixes them in ternaries and doesn't care to fix it (even for compatibility with eslint), so i'm just gonna let prettier handle the tabs/spaces thing (https://github.com/prettier/prettier/issues/5811#issuecomment-458936781)

			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					ignoreRestSiblings: true,
				},
			],
		},
	},
]);

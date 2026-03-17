/**
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
const config = {
	preset: "ts-jest",
	extensionsToTreatAsEsm: [".ts"], // used by the moduleNameMapper config property
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1", // ts modules aren't detected without this. copied from: https://stackoverflow.com/a/69598249
	},

	collectCoverage: true,
	coverageProvider: "v8",
	coverageDirectory: ".coverage",
	coveragePathIgnorePatterns: ["/node_modules/"],
};

export default config;

import {timestampedLog} from "#/src/logging.js";

const required = [
	"POSTGRES_DB",
	"POSTGRES_USER",
	"POSTGRES_PASSWORD",
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

export const POSTGRES_DB = process.env.POSTGRES_DB as string;
export const POSTGRES_USER = process.env.POSTGRES_USER as string;
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD as string;

if (!process.env.SESSION_SECRET) timestampedLog("WARNING: SESSION_SECRET is not set, using insecure default");

export const SESSION_SECRET = process.env.SESSION_SECRET ?? "sessionkey";

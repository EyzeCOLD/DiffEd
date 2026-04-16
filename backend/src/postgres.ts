import {readFileSync} from "fs";
import pg from "pg";
import {timestampedLog} from "./logging.js";
import argon2 from "argon2";

const maxConnectionAttempts = 3;
const pgConfig = {
	host: "postgres",
	database: process.env.POSTGRES_DB,
	user: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
} as const;

const postgres = new pg.Pool(pgConfig);

for (let attempt = 1; attempt <= maxConnectionAttempts; attempt++) {
	// very first setup from the postgres docker image takes a bit. without these retries, the non-dev version ends up with a borked db connection & setup
	try {
		await postgres.connect();
		timestampedLog(`Connected to Postgres ${attempt > 1 ? `(${attempt}/${maxConnectionAttempts} attempts)` : ""}`);
		break;
	} catch {
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}

	if (attempt === maxConnectionAttempts) {
		throw new Error(`Failed to connect to Postgres (${attempt}/${maxConnectionAttempts} attempts)`);
	}
}

for (const fileName of ["users.sql", "files.sql", "sessions.sql"]) {
	const fileContent = readFileSync("/backend/sql/" + fileName, "utf-8");
	await postgres.query(fileContent).catch((error) => timestampedLog(error));
}

if (process.env.NODE_ENV === "developement") {
	const testUserA = {
		username: "testa",
		email: "test@mail.fi",
		hashed_password: await argon2.hash("testa"),
	};
	const testUserB = {
		username: "testb",
		email: "test@mail.no",
		hashed_password: await argon2.hash("testb"),
	};
	const values: string[] = [];
	Object.values(testUserA).forEach((v) => values.push(v));
	Object.values(testUserB).forEach((v) => values.push(v));
	console.log("VALUES", values);

	await postgres
		.query("INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3), ($4, $5, $6)", values)
		.catch((error) => timestampedLog(error));
}

export {postgres};

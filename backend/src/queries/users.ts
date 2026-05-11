import {postgres as db} from "../postgres.js";
import {User, UserWithPassword} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";

async function getUserById(id: number): Promise<User | null> {
	const query = "SELECT id, username, email, (github_id IS NOT NULL) AS github_linked FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const {rows} = await db.query(query, [id]);

	if (!rows.length) return null;

	return rows[0];
}

async function getUserWithPasswordById(id: number): Promise<UserWithPassword | null> {
	const query = "SELECT * FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const {rows} = await db.query(query, [id]);

	if (!rows.length) return null;

	return rows[0];
}

async function getUserByUsername(username: string): Promise<User | null> {
	const query = "SELECT id, username, email FROM users WHERE username = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[username]}`);
	const {rows} = await db.query(query, [username]);

	if (!rows.length) return null;

	return rows[0];
}

async function getUserByEmail(email: string): Promise<User | null> {
	const query = "SELECT id, username, email FROM users WHERE email = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[email]}`);
	const {rows} = await db.query(query, [email]);

	if (!rows.length) return null;

	return rows[0];
}

async function getUserWithPasswordByIdentifier(identifier: string): Promise<UserWithPassword | null> {
	const query = "SELECT * FROM users WHERE email = $1 OR username = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[identifier]}`);
	const {rows} = await db.query(query, [identifier]);

	if (!rows.length) return null;

	return rows[0];
}

async function getHashedPasswordById(id: number): Promise<string | null> {
	const query = "SELECT hashed_password FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const {rows} = await db.query(query, [id]);

	if (!rows.length) return null;

	return rows[0].hashed_password;
}
async function getUserByGithubId(githubId: string): Promise<User | null> {
	const query = "SELECT id, username, email FROM users WHERE github_id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[githubId]}`);
	const {rows} = await db.query(query, [githubId]);

	if (!rows.length) return null;

	return rows[0];
}

async function getAPIKeyById(id: number): Promise<string | null> {
	const query = "SELECT APIKey FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const {rows} = await db.query(query, [id]);

	if (!rows.length) return null;

	return rows[0];
}

async function createOAuthUser(username: string, email: string, githubId: string): Promise<number> {
	const query = "INSERT INTO users (username, email, github_id) VALUES ($1, $2, $3) RETURNING id";
	const values = [username, email, githubId];
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const {rows} = await db.query(query, values);

	return rows[0].id;
}

async function linkGithubId(userId: number, githubId: string): Promise<boolean> {
	const query = "UPDATE users SET github_id = $1 WHERE id = $2";
	const values = [githubId, userId];
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const result = await db.query(query, values);

	return result.rowCount! > 0;
}

async function createUser(username: string, email: string, hash: string): Promise<number> {
	const query = "INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3) RETURNING id";
	const values = [username, email, hash || null];
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const {rows} = await db.query(query, values);

	return rows[0].id;
}

async function updateUsername(username: string, id: number): Promise<boolean> {
	const query = "UPDATE users SET username = $1 WHERE id = $2";
	const values = [username, id];
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const result = await db.query(query, values);

	return result.rowCount! > 0;
}

async function updateEmail(email: string, id: number): Promise<boolean> {
	const values = [email, id];
	const query = "UPDATE users SET email = $1 WHERE id = $2";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const result = await db.query(query, values);

	return result.rowCount! > 0;
}

async function updatePassword(hash: string, id: number): Promise<boolean> {
	const values = [hash, id];
	const query = "UPDATE users SET hashed_password = $1 WHERE id = $2";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const result = await db.query(query, values);

	return result.rowCount! > 0;
}

async function updateAPIKey(hash: string, id: number): Promise<boolean> {
	const values = [hash, id];
	const query = "UPDATE users SET APIKey = $1 WHERE id = $2";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const result = await db.query(query, values);

	return result.rowCount! > 0;
}

async function unlinkGithubId(userId: number): Promise<boolean> {
	const query = "UPDATE users SET github_id = NULL WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[userId]}`);
	const result = await db.query(query, [userId]);

	return result.rowCount! > 0;
}

async function deleteUserById(id: number): Promise<boolean> {
	const query = "DELETE FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const result = await db.query(query, [id]);

	return result.rowCount! > 0;
}

export default {
	getUserById,
	getUserWithPasswordById,
	getUserByUsername,
	getUserByEmail,
	getUserByGithubId,
	getUserWithPasswordByIdentifier,
	getAPIKeyById,
	createUser,
	createOAuthUser,
	linkGithubId,
	getHashedPasswordById,
	updateUsername,
	updateEmail,
	updatePassword,
	updateAPIKey,
	unlinkGithubId,
	deleteUserById,
};

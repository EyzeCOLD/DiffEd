import {postgres as db} from "../postgres.js";
import {User} from "#shared/src/types.js";
import {timestampedLog} from "#/src/logging.js";

async function getUserById(id: number): Promise<User | null> {
	const query = "SELECT id, username, email FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const result = await db.query(query, [id]);

	if (!result.rows.length) return null;

	return result.rows[0];
}

async function getUserByUsername(username: string): Promise<User | null> {
	const query = "SELECT id, username, email FROM users WHERE username = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[username]}`);
	const result = await db.query(query, [username]);

	if (!result.rows.length) return null;

	return result.rows[0];
}

async function getUserByEmail(email: string): Promise<User | null> {
	const query = "SELECT id, username, email FROM users WHERE email = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[email]}`);
	const result = await db.query(query, [email]);

	if (!result.rows.length) return null;

	return result.rows[0];
}

async function getUserByIdentifier(identifier: string): Promise<User | null> {
	const userByUsername = await getUserByUsername(identifier);
	if (userByUsername) return userByUsername;

	const userByEmail = await getUserByEmail(identifier);
	if (userByEmail) return userByEmail;

	return null;
}

// CHECK THIS FUNCTION! MIGHT BE NECESSARY TO IMPLEMENT TWO USER CREATION FUNCTIONS
// ONE FOR LOCAL CREATION AND ONE FOR OAUTH CREATION
async function createUser(user: Omit<User, "id">, hash: string | undefined): Promise<number> {
	const query = "INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3) RETURNING id";
	const values = [user.username, user.email, hash || null];
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${values}`);
	const {rows} = await db.query(query, values);
	return rows[0].id;
}

async function deleteUserById(id: number): Promise<boolean> {
	const query = "DELETE FROM users WHERE id = $1";
	timestampedLog(`DB QUERY >>> ${query}`);
	timestampedLog(`DB VALUES >>> ${[id]}`);
	const result = await db.query(query, [id]);

	return (result.rowCount as number) > 0;
}

export {getUserById, getUserByUsername, getUserByEmail, getUserByIdentifier, createUser, deleteUserById};

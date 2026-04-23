import {postgres as db} from "./postgres.js";
import {User, userSchema} from "#/src/validation/schemas.js";

export async function getUserById(id: number): Promise<User | null> {
	const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
	if (result.rows.length === 0) return null;
	return userSchema.parse(result.rows[0]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
	const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
	if (result.rows.length === 0) return null;
	return userSchema.parse(result.rows[0]);
}

export async function getUserByUsername(username: string): Promise<User | null> {
	const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
	if (result.rows.length === 0) return null;
	return userSchema.parse(result.rows[0]);
}

export async function getUserByIdentifier(identifier: string): Promise<User | null> {
	const userByEmail = await getUserByEmail(identifier);
	if (userByEmail) return userByEmail;

	const userByUsername = await getUserByUsername(identifier);
	if (userByUsername) return userByUsername;

	return null;
}

export async function createUser(user: Omit<User, "id">): Promise<User> {
	const result = await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *", [
		user.username,
		user.email,
		user.password || null,
	]);
	return userSchema.parse(result.rows[0]);
}

export async function deleteUser(id: number): Promise<boolean> {
	const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
	return result.rows.length > 0;
}

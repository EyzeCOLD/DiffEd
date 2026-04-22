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

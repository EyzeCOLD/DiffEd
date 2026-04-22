import {postgres as db} from "./postgres.js";
import {User, userSchema, createUserSchema, createOAuthUserSchema} from "#/src/validation/schemas.js";
import {z} from "zod";

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

export async function createLocalUser(user: z.infer<typeof createUserSchema>): Promise<User> {
	const result = await db.query(
		"INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3) RETURNING *",
		[user.username, user.email, user.password],
	);
	return userSchema.parse(result.rows[0]);
}

export async function createOAuthUser(user: z.infer<typeof createOAuthUserSchema>): Promise<User> {
	const result = await db.query(
		"INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3) RETURNING *",
		[user.username, user.email, user.password || null],
	);
	return userSchema.parse(result.rows[0]);
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User> {
	const fields = [];
	const values = [];
	let i = 1;

	for (const [key, value] of Object.entries(updates)) {
		if (value !== undefined) {
			fields.push(`${key} = $${i}`);
			values.push(value);
			i++;
		}
	}

	values.push(id);
	const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`;
	const result = await db.query(query, values);
	return userSchema.parse(result.rows[0]);
}

export async function deleteUser(id: number): Promise<boolean> {
	const result = await db.query("DELETE FROM users WHERE id  = $1", [id]);
	return result.rows.length > 0;
}

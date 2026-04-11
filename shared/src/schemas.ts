import {type UserFile, type SigningUser} from "../src/types.js";
import {z, type ZodType} from "zod";

export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters long")
	.refine((password) => /[a-z]/.test(password), "Password must contain at least 1 small letter")
	.refine((password) => /[A-Z]/.test(password), "Password must contain at least 1 capital letter")
	.refine((password) => /[0-9]/.test(password), "password must contain at least 1 number")
	.refine((password) => /[!@#$%^&*]/.test(password), "Password must contain at least 1 special character '!@#$%^&*'");

export const usernameSchema = z
	.string()
	.min(3, "Username has to be at least 3 characters long")
	.max(20, "Username can't be over 20 characters long")
	.regex(/^[a-zA-Z0-9_]+$/, "Username must contain only small/capital letter, numbers or underscore");

export const emailSchema = z.email();

export const SignupSchema = z.object({
	username: usernameSchema,
	email: z.email(),
	password: passwordSchema,
}) satisfies ZodType<SigningUser>;

// id here for testing
export const UserFileSchema = z.object({
	id: z.uuidv4(),
	name: z
		.string()
		.min(1)
		.max(255)
		// regex to catch suspicious stuff (<, >, :, ", |, ?, *, \x00)
		.regex(/^[^<>"|?*\x00]+$/, "Invalid filename")
		.refine((val) => !val.includes("../"), "Path traversal not allowed")
		.refine((val) => !val.startsWith("/"), "Path must be relative")
		.refine((val) => !val.includes("/\/"), "Invalid path")
		.refine((val) => !val.endsWith("/"), "Path cannot end with a slash"),
	content: z
		.string()
		.refine((val) => new TextEncoder().encode(val).length <= 1000000, {message: "File content exceeds 1MB"}),
}) satisfies ZodType<UserFile>;

import {type UserFile, type SigningUser} from "#shared/src/types.js";
import {z, type ZodType} from "zod";

export const usernameSchema = z
	.string()
	.min(3, "Username has to be at least 3 characters long")
	.max(20, "Username can't be over 20 characters long")
	.regex(/^[a-zA-Z0-9_]+$/, "Username must contain only small/capital letter, numbers or underscore");

export const emailSchema = z.email();
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters long").nullable().optional();

export const userSchema = z.object({
	id: z.number(),
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema,
});

export type User = z.infer<typeof userSchema>;

export const createUserSchema = userSchema.omit({id: true}).extend({
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const createOAuthUserSchema = userSchema.omit({id: true}).extend({
	password: z.string().nullable().optional(),
});

export const SignupSchema = z.object({
	username: usernameSchema,
	email: z.email(),
	password: passwordSchema,
}) satisfies ZodType<SigningUser>;

// id here for testing
export const UserFileSchema = z.object({
	id: z.uuidv4(),
	name: z.string(),
	content: z.string(),
	owner_id: z.number(),
}) satisfies ZodType<UserFile>;

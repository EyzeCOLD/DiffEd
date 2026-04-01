import {type Placeholder, type UserFile, type SigningUser} from "#shared/src/types.js";
import {z, type ZodType} from "zod";

export const placeholderSchema = z.string() satisfies ZodType<Placeholder>;

const passWordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .refine((password) => /[a-z]/.test(password), "Password must contain at least one small letter")
    .refine((password) => /[A-Z]/.test(password), "Password must contain at least 1 capital letter")
    .refine((password) => /[0-9]/.test(password), "password must contain at least 1 number")
    .refine((password) => /[!@#$%^&*]/.test(password), "Password must contain at least 1 special character '!@#$%^&*'");

const usernameSchema = z
.string()
.min(3, "Username has to be at least 3 characters long")
.max(20, "Username can't be over 20 characters long")
.regex(/^[a-zA-Z0-9_]+$/, "Username must contain only small/capital letter, numbers or underscore");

export const UserSignupSchema = z.object({
    username: usernameSchema,
    email: z.email(),
    password: passWordSchema,
}) satisfies ZodType<SigningUser>;

// id here for testing
export const UserFileSchema = z.object({
	id: z.uuidv4(),
	name: z.string(),
	content: z.string(),
}) satisfies ZodType<UserFile>;

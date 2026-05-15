import {type UserFile, type SigningUser} from "#shared/src/types.js";
import {z, type ZodType} from "zod";

const PASSWORD_MIN_LENGTH = 14;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;

export const passwordSchema = z
	.string()
	.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);

export const usernameSchema = z
	.string()
	.min(USERNAME_MIN_LENGTH, `Username has to be at least ${USERNAME_MIN_LENGTH} characters long`)
	.max(USERNAME_MAX_LENGTH, `Username can't be over ${USERNAME_MAX_LENGTH} characters long`)
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
	name: z.string(),
	content: z.string(),
	owner_id: z.number(),
}) satisfies ZodType<UserFile>;

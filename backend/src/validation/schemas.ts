import {type UserFile} from "#shared/src/types.js";
import {z, type ZodType} from "zod";

// id here for testing
export const UserFileSchema = z.object({
	id: z.uuidv4(),
	name: z.string(),
	content: z.string(),
}) satisfies ZodType<UserFile>;

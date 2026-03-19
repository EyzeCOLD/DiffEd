import {type Placeholder, type UserFile} from "../../../shared/src/types.js";
import {z, type ZodType} from "zod";

export const placeholderSchema = z.string() satisfies ZodType<Placeholder>;

// id here for testing
export const UserFileSchema = z.object({
	id: z.number(),
	fileName: z.string(),
	fileContent: z.string(),
}) satisfies ZodType<UserFile>;

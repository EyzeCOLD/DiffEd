import {type Placeholder} from "../../../shared/src/types.js";
import {z, type ZodType} from "zod";

export const placeholderSchema = z.string() satisfies ZodType<Placeholder>;

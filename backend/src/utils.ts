import {DatabaseError} from "pg";

export function isDbError(error: unknown): error is DatabaseError {
	return error instanceof DatabaseError;
}

// call isDbError first to make sure the type is right
export function isUniqueViolation(error: DatabaseError): boolean {
	return error.code === "23505";
}

export function isInvalidByteSequence(error: DatabaseError): boolean {
	return error.code === "22021";
}

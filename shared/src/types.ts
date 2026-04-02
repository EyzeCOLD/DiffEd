export type Placeholder = string;

// id here for testing
export interface UserFile {
	id: string;
	name: string;
	content: string;
}

export type SigningUser  = {
   username: string;
   email: string;
   password: string;
}

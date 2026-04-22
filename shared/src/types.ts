// id here for testing
export type UserFile = {
	id: string;
	name: string;
	content: string;
	owner_id: number;
};

export type User = {
	id: number;
	username: string;
	email: string;
	password?: string | null;
};

export type GitHubProfile = {
	id: string;
	username: string;
	displayName: string;
	emails?: {value: string; primary: boolean}[];
	photos?: {value: string}[];
	provider: string;
};

export type SigningUser = {
	username: string;
	email: string;
	password: string;
};

export type ErrorResponse = {
	error: string;
};

export type SerializedUpdate = {
	clientID: string;
	changes: unknown;
};

export type CollabRequestPayload =
	| {
			type: "getInitialDocument";
	  }
	| {
			type: "pullUpdates";
			version: number;
	  }
	| {
			type: "pushUpdates";
			version: number;
			updates: SerializedUpdate[];
	  }
	| {
			type: "pushFileName";
			name: string;
	  };

export type CollabRequest = CollabRequestPayload & {
	id: number;
	fileId: string;
};

export type DocumentResponse =
	| {
			version: number;
			doc: string;
	  }
	| ErrorResponse;

export type NameUpdateResponse =
	| {
			name: string;
	  }
	| ErrorResponse;

export type ApiSuccess<T> = {ok: true; data: T};
export type ApiError = {ok: false; error: string};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

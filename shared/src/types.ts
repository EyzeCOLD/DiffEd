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
};

export type SigningUser = Omit<User, "id"> & {
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
			ownerId: number;
	  }
	| {
			type: "pullUpdates";
			version: number;
			ownerId: number;
	  }
	| {
			type: "pushUpdates";
			version: number;
			updates: SerializedUpdate[];
	  }
	| {
			type: "pushFileName";
			name: string;
	  }
	| {
			type: "pickFile";
			fileId: string;
	  }
	| {
			type: "leaveSession";
	  };

export type CollabRequest = CollabRequestPayload & {
	requestId: number;
	sessionId: string;
};

export type CollabResponse =
	| {
			requestId: number;
			result: unknown;
	  }
	| ErrorResponse;

export type SessionMember = Pick<User, "id" | "username">;

export type SessionInfo = {
	id: string;
	members: SessionMember[];
};

export type MembersChangedEvent = {
	sessionId: string;
	members: SessionMember[];
};

export type DocumentResponse = {
	version: number;
	doc: string;
	fileName: string;
};

export type NameUpdateResponse = {
	name: string;
};

export type ApiSuccess<T> = {ok: true; data: T};
export type ApiError = {ok: false; error: string};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

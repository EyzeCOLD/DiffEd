// id here for testing
export type UserFile = {
	id: string;
	name: string;
	content: string;
	owner_id: number;
};

export type User = {
	username: string;
	email: string;
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
	id: number;
	sessionId: string;
};

export type SessionMember = {
	userId: number;
	username: string;
};

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
};

export type NameUpdateResponse = {
	name: string;
};

export type ApiSuccess<T> = {ok: true; data: T};
export type ApiError = {ok: false; error: string};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

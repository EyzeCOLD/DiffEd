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
			type: "pullFileName";
	  }
	| {
			type: "leaveWorkspace";
	  };

export type CollabRequest = CollabRequestPayload & {
	requestId: number;
	workspaceId: string;
};

export type CollabResponse =
	| {
			requestId: number;
			result: unknown;
	  }
	| ErrorResponse;

export type WorkspaceMember = Pick<User, "id" | "username">;

export type WorkspaceInfo = {
	id: string;
	members: WorkspaceMember[];
};

export type MembersChangedEvent = {
	workspaceId: string;
	members: WorkspaceMember[];
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

export type Placeholder = string;

// id here for testing
export type UserFile = {
	id: string;
	name: string;
	content: string;
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
			type: "getFileName";
	  }
	| {
			type: "pullFileName";
			version: number;
	  }
	| {
			type: "pushFileName";
			version: number;
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
			version: number;
	  }
	| ErrorResponse;

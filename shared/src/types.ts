export type Placeholder = string;

// id here for testing
export interface UserFile {
	id: string;
	name: string;
	content: string;
}

export interface ErrorResponse {
	error: string;
}

export interface SerializedUpdate {
	clientID: string;
	changes: unknown;
}

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

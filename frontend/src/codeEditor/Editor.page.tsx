import {useParams} from "react-router";
import type {WorkspaceInfo} from "#shared/src/types";
import {useEffect, useMemo, useState} from "react";
import {CollabConnection, leaveWorkspace} from "./collabClient";
import {apiFetch} from "../utils";
import FilePicker from "./FilePicker";
import Editor from "./Editor";
import {useCurrentUser} from "../stores/userStore";

export default function EditorPage() {
	const params = useParams();
	const workspaceId = params.workspaceId;
	const user = useCurrentUser()!;

	const [sessionInfo, setSessionInfo] = useState<WorkspaceInfo | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [joining, setJoining] = useState(true);
	const [showFilePicker, setShowFilePicker] = useState(false);

	const connection = useMemo(() => (workspaceId ? new CollabConnection(workspaceId) : null), [workspaceId]);

	useEffect(() => {
		if (!workspaceId) return;
		let cancelled = false;
		apiFetch<WorkspaceInfo>(`/api/workspace/${workspaceId}`)
			.then((response) => {
				if (cancelled) return;
				if (!response.ok) {
					setErrorMessage(response.error);
					return;
				}
				setSessionInfo(response.data);
				setJoining(false);
			})
			.catch((err) => {
				if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Failed to load session");
			});
		return () => {
			cancelled = true;
		};
	}, [workspaceId]);

	useEffect(() => {
		if (!connection) return;
		const unsubscribe = connection.subscribeMembers((event) => {
			setJoining(false);
			setShowFilePicker(false);
			setSessionInfo({
				id: event.workspaceId,
				members: event.members,
			});
		});
		return unsubscribe;
	}, [connection, user.id]);

	useEffect(() => {
		if (!connection) return;
		return function cleanup() {
			void leaveWorkspace(connection);
			connection.disconnect();
		};
	}, [connection]);

	if (!workspaceId) return <div>Session ID is missing</div>;
	if (errorMessage) return <div className="p-4 text-red-500">{errorMessage}</div>;
	if (joining) return <div>Joining session...</div>;

	if (!connection || !sessionInfo) return <div>Failed to load session</div>;

	const isMember = sessionInfo.members.some((member) => member.id === user.id);

	if (!isMember || showFilePicker) {
		return <FilePicker connection={connection} />;
	}

	return (
		<Editor
			connection={connection}
			myOwnerId={user.id}
			initialMembers={sessionInfo.members}
			onRepickFile={() => setShowFilePicker(true)}
		/>
	);
}

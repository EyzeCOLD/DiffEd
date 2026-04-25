import {useParams} from "react-router";
import type {SessionInfo} from "#shared/src/types";
import {useEffect, useMemo, useState} from "react";
import {CollabConnection} from "./collabClient";
import {apiFetch} from "../utils";
import FilePicker from "./FilePicker";
import SharedEditor from "./SharedEditor";
import {useCurrentUser} from "../stores/userStore";

export default function EditorPage() {
	const params = useParams();
	const sessionId = params.sessionId;
	const user = useCurrentUser()!;

	const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const connection = useMemo(() => (sessionId ? new CollabConnection(sessionId) : null), [sessionId]);

	useEffect(() => {
		if (!sessionId) return;
		let cancelled = false;
		apiFetch<SessionInfo>(`/api/workspace/${sessionId}`)
			.then((response) => {
				if (cancelled) return;
				if (!response.ok) {
					setErrorMessage(response.error);
					return;
				}
				setSessionInfo(response.data);
			})
			.catch((err) => {
				if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Failed to load session");
			});
		return () => {
			cancelled = true;
		};
	}, [sessionId]);

	useEffect(() => {
		if (!connection) return;
		const unsubscribe = connection.subscribeMembers((event) => {
			setSessionInfo({
				id: event.sessionId,
				members: event.members,
				isCurrentUserMember: event.members.some((m) => m.userId === user.id),
			});
		});
		return unsubscribe;
	}, [connection, user.id]);

	useEffect(() => {
		return function cleanup() {
			connection?.disconnect();
		};
	}, [connection]);

	if (!sessionId) return <div>Session ID is missing</div>;
	if (errorMessage) return <div className="p-4 text-red-500">{errorMessage}</div>;
	if (!sessionInfo || !connection) return <div>Loading...</div>;

	const isMember = sessionInfo.isCurrentUserMember;

	if (!isMember) {
		return (
			<FilePicker
				connection={connection}
				onPicked={() => {
					setSessionInfo((prev) => {
						if (!prev || prev.members.some((m) => m.userId === user.id)) return prev;
						return {
							id: prev.id,
							members: [...prev.members, {userId: user.id, username: user.username}],
							isCurrentUserMember: true,
						};
					});
				}}
			/>
		);
	}

	return <SharedEditor connection={connection} myOwnerId={user.id} initialMembers={sessionInfo.members} />;
}

import {useNavigate, useParams} from "react-router";
import type {SessionInfo} from "#shared/src/types";
import {useEffect, useMemo, useState} from "react";
import {CollabConnection} from "./collabClient";
import {apiFetch} from "../utils";
import FilePicker from "./FilePicker";
import SharedEditor from "./SharedEditor";

type Me = {id: number; username: string};

export default function EditorPage() {
	const params = useParams();
	const sessionId = params.sessionId;
	const navigate = useNavigate();

	const [me, setMe] = useState<Me | null>(null);
	const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const connection = useMemo(
		() => (sessionId && me ? new CollabConnection(sessionId, me.id) : null),
		[sessionId, me],
	);

	useEffect(() => {
		fetch("/api/user")
			.then((res) => {
				if (!res.ok) {
					navigate("/login");
					return null;
				}
				return res.json() as Promise<Me>;
			})
			.then((data) => {
				if (data) setMe(data);
			})
			.catch(() => setErrorMessage("Failed to connect to server"));
	}, [navigate]);

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
			setSessionInfo({id: event.sessionId, members: event.members});
		});
		return unsubscribe;
	}, [connection]);

	useEffect(() => {
		return function cleanup() {
			connection?.disconnect();
		};
	}, [connection]);

	if (!sessionId) return <div>Session ID is missing</div>;
	if (errorMessage) return <div className="p-4 text-red-500">{errorMessage}</div>;
	if (!me || !sessionInfo || !connection) return <div>Loading...</div>;

	const isMember = sessionInfo.members.some((m) => m.userId === me.id);

	if (!isMember) {
		return (
			<FilePicker
				connection={connection}
				onPicked={() => {
					setSessionInfo((prev) => {
						if (!prev || prev.members.some((m) => m.userId === me.id)) return prev;
						return {id: prev.id, members: [...prev.members, {userId: me.id, username: me.username}]};
					});
				}}
			/>
		);
	}

	return <SharedEditor connection={connection} myOwnerId={me.id} initialMembers={sessionInfo.members} />;
}

import {useState, useEffect} from "react";
import {io} from "socket.io-client";

const socket = io();

type MessageEvent = {
	text: string;
	sentAt: string;
	senderId?: string;
};

function parseMessageEvent(value: unknown): MessageEvent {
	if (typeof value === "object" && value !== null) {
		const record = value as {text?: unknown; sentAt?: unknown; senderId?: unknown};
		return {
			text: typeof record.text === "string" ? record.text : String(record.text ?? ""),
			sentAt: typeof record.sentAt === "string" ? record.sentAt : new Date().toISOString(),
			senderId: typeof record.senderId === "string" ? record.senderId : undefined,
		};
	}

	return {
		text: String(value),
		sentAt: new Date().toISOString(),
	};
}

export default function SocketTestPage() {
	const [isConnected, setIsConnected] = useState(socket.connected);
	const [messageEvents, setMessageEvents] = useState<MessageEvent[]>([]);
	const [messageToSend, setMessageToSend] = useState("");

	useEffect(() => {
		function onConnect() {
			setIsConnected(true);
		}

		function onDisconnect() {
			setIsConnected(false);
		}

		function onMessageEvent(value: unknown) {
			setMessageEvents((previous) => [...previous, parseMessageEvent(value)]);
		}

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("message", onMessageEvent);
		socket.connect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("message", onMessageEvent);
			socket.disconnect();
		};
	}, []);

	function sendMessage() {
		const trimmedMessage = messageToSend.trim();
		if (!trimmedMessage) {
			return;
		}

		if (!socket.connected) {
			socket.connect();
		}

		socket.emit("message", {
			text: trimmedMessage,
			sentAt: new Date().toISOString(),
		});

		setMessageToSend("");
	}

	return (
		<div className="App">
			<div>Connected: {isConnected.toString()}</div>
			<input
				type="text"
				value={messageToSend}
				onChange={(event) => setMessageToSend(event.target.value)}
				placeholder="Type a message"
			/>
			<button type="button" onClick={sendMessage} disabled={!isConnected || !messageToSend.trim()}>
				Send
			</button>
			<div>
				Message events:
				<ul>
					{messageEvents.map((event, index) => (
						<li key={`${event.sentAt}-${index}`}>
							{event.senderId} ({event.sentAt}): {event.text}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

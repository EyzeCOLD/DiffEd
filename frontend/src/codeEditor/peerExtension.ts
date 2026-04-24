import {EditorView, ViewUpdate, ViewPlugin, type PluginValue} from "@codemirror/view";
import {collab, getSyncedVersion, sendableUpdates, receiveUpdates} from "@codemirror/collab";
import {CollabConnection, pushUpdates, pullUpdates} from "./collabClient";
import {delay} from "../utils";

const PUSH_MS_INTERVAL = 100;
const PULL_MS_INTERVAL = 1000;

export function peerExtension(startVersion: number, connection: CollabConnection, ownerId: number) {
	class LocalPeerPlugin implements PluginValue {
		pushing = false;
		done = false;
		view: EditorView;

		constructor(v: EditorView) {
			this.view = v;
			void this.pull();
		}

		update(update: ViewUpdate): void {
			if (update.docChanged) {
				void this.push();
			}
		}

		async push(): Promise<void> {
			const updates = sendableUpdates(this.view.state);
			if (this.pushing || !updates.length) return;
			this.pushing = true;
			const version = getSyncedVersion(this.view.state);
			try {
				await pushUpdates(connection, version, updates);
			} catch (error) {
				console.error("Failed to push updates:", error);
			}
			this.pushing = false;

			if (sendableUpdates(this.view.state).length) {
				setTimeout(() => void this.push(), PUSH_MS_INTERVAL);
			}
		}

		async pull(): Promise<void> {
			while (!this.done) {
				const version = getSyncedVersion(this.view.state);
				try {
					const updates = await pullUpdates(connection, ownerId, version);
					if (this.done) return;
					this.view.dispatch(receiveUpdates(this.view.state, updates));
				} catch (error) {
					if (this.done) return;
					console.error("Failed to pull updates:", error);
					await delay(PULL_MS_INTERVAL);
				}
			}
		}

		destroy(): void {
			this.done = true;
		}
	}

	return [collab({startVersion}), ViewPlugin.fromClass(LocalPeerPlugin)];
}

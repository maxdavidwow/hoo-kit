import { HookitEvent, HookCallback } from '../../types';
import * as chokidar from 'chokidar';

const watchers = new Map<string, chokidar.FSWatcher>();

type ChokidarEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
export default {
	subscribe(uuid: string, callback: HookCallback, args: { events: ChokidarEvent[]; path: string; ignore?: string }) {
		const watcher = chokidar.watch(args.path, {
			ignored: args.ignore
		});
		watchers.set(uuid, watcher);
		watcher.on('error', (error) => console.log(`filesystem/on error: ${error}`));
		watcher.on('ready', () => {
			args.events.forEach((event) => {
				watcher.on(event, (path) => {
					callback(JSON.stringify({ path, event }));
				});
			});
		});
		return true;
	},

	unsubscribe(uuid: string) {
		watchers.get(uuid).close();
		watchers.delete(uuid);
		return true;
	}
} as HookitEvent;

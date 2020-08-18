import { HookitEvent } from '../../types';

const callbacks = new Map<string, (args) => void>();

export default {
	prerequisite(args: object) {
		return true;
	},

	subscribe(taskName: string, callback: (args) => void, args: object) {
		callbacks.set(taskName, callback);
		return true;
	},

	unsubscribe(taskName: string, args: object) {
		// since unsubscribe will be called when the event is removed or hookit is closed properly
		// we just call the callback inside this unsubscribe method
		callbacks.get(taskName)(undefined);
		// after calling it, since this is still the unsubscribe method, we remove the callback
		callbacks.delete(taskName);
		return true;
	}
} as HookitEvent;

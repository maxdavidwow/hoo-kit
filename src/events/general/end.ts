import { HookitEvent, HookCallback } from '../../types';

const callbacks = new Map<string, (args) => void>();

export default {
	subscribe(uuid: string, callback: HookCallback, args: object) {
		callbacks.set(uuid, callback);
		return true;
	},

	unsubscribe(uuid: string, args: object) {
		// since unsubscribe will be called when the event is removed or hookit is closed properly
		// we just call the callback inside this unsubscribe method
		callbacks.get(uuid)(undefined);
		// after calling it, since this is still the unsubscribe method, we remove the callback
		callbacks.delete(uuid);
		return true;
	}
} as HookitEvent;

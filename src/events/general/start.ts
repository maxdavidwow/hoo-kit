import { HookitEvent } from '../../types';

export default {
	subscribe(taskName: string, callback: (args) => void, args: object) {
		// since this event will be subscribed to when starting hookit
		// we just call the callback
		callback(undefined);
		return true;
	}
} as HookitEvent;

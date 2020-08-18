import { HookitEvent, HookCallback } from '../../types';

export default {
	subscribe(uuid: string, callback: HookCallback, args: object) {
		// since this event will be subscribed to when starting hookit
		// we just call the callback
		callback(undefined);
		return true;
	}
} as HookitEvent;

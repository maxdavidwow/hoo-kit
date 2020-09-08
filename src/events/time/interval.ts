import { HookitEvent, HookCallback } from '../../types';

const timers = new Map<
	string,
	{
		tid: NodeJS.Timeout;
		callback: HookCallback;
		args: object;
	}
>();

const runInterval = (callback: HookCallback, args: { interval: number }) => {
	return setInterval(callback, args.interval);
};

export default {
	subscribe(uuid: string, callback: HookCallback, args) {
		timers.set(uuid, { callback, args, tid: runInterval(callback, args) });
		return true;
	},

	unsubscribe(uuid: string) {
		clearInterval(timers.get(uuid).tid);
		timers.delete(uuid);
		return true;
	}
} as HookitEvent;

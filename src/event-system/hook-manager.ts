import { HookCallback, UUID } from '../types';
import { getEventByPath } from './event-manager';
import { v4 as uuid, validate as validateUUID } from 'uuid';

export type HookParameter = {
	taskName: string;
	eventPath: string;
	callback: HookCallback;
	args?: object;
};

export const hooks = new Map<string, HookParameter>();

/**
 * will hook the callback to the given event
 */
export function hook(hookParam: HookParameter): UUID {
	const event = getEventByPath(hookParam.eventPath);
	event.subscribe(hookParam.taskName, hookParam.callback, hookParam.args);
	const id = uuid();
	hooks.set(id, hookParam);
	return id;
}

/**
 * unhook the task from the given event
 */
export function unhook(id: UUID): boolean {
	try {
		if (!validateUUID(id)) {
			throw new Error('Invalid hook uuid.');
		}
		const hookParam = hooks.get(id);
		const event = getEventByPath(hookParam.eventPath);
		event.unsubscribe(hookParam.taskName, hookParam.args);
		return true;
	} catch (ex) {
		return false;
	}
}

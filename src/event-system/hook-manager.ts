import { HookCallback, UUID } from '../types';
import { getEventByPath } from './event-manager';
import { v4 as uuid, validate as validateUUID } from '../session/node_modules/uuid';

export type HookParameter = {
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
	const id = uuid();
	event.subscribe(id, hookParam.callback, hookParam.args);
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
		if (event.unsubscribe) {
			event.unsubscribe(id, hookParam.args);
		}
		return true;
	} catch (ex) {
		return false;
	}
}

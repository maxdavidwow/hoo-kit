import { HookitTask } from '../types';
import { getEventByPath } from './event-manager';

const hooks = new Map<string, HookitTask>();

/**
 * will hook the task to the given event
 */
export function hook(eventPath: string, task: HookitTask) {
	hooks.set(eventPath, task);
	const event = getEventByPath(eventPath);
}

/**
 * unhook the task from the given event
 */
export function unhook(eventPath: string, task: HookitTask) {}

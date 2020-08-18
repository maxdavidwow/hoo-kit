import * as path from 'path';
import { requireCustomEventModules, customEventModules } from './custom-events';
import { HookitEvent } from '../types';

export default function () {
	requireCustomEventModules();
}

const loadedEvents = new Map<string, HookitEvent>();

export function getEventByPath(eventPath: string): HookitEvent {
	if (loadedEvents.has(eventPath)) {
		return loadedEvents.get(eventPath);
	} else {
		let event: HookitEvent;
		if (eventPath.includes('/')) {
			// the / indicates that the event must be a custom event e.g.: mycustomevents/customevent
			// wich will result in the path ./node_modules/hookit-cem-mycustomevents/customevent
			const names = eventPath.split('/');
			const customModuleName = names[0];
			const eventName = names[1];
			event = customEventModules.get(customModuleName)[eventName];
		} else {
			// this will be a default event so we require it from our local files
			event = require(path.resolve('../events' + eventPath));
		}
		loadedEvents.set(eventPath, event);
	}
}

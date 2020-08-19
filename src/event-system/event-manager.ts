import { requireCustomEventModules, customEventModules } from './custom-events';
import { HookitEvent } from '../types';

export default function () {
	requireCustomEventModules();
}

export const defaultEvents = [
	'general/start',
	'general/end',

	'time/date',
	'time/periodic',

	'filesystem/created',
	'filesystem/modified',
	'filesystem/deleted',

	'git/applypatch-msg',
	'git/pre-applypatch',
	'git/post-applypatch',
	'git/pre-commit',
	'git/prepare-commit-msg',
	'git/commit-msg',
	'git/post-commit',
	'git/pre-rebase',
	'git/post-checkout',
	'git/post-merge',
	'git/pre-receive',
	'git/update',
	'git/post-receive',
	'git/post-update',
	'git/pre-auto-gc',
	'git/post-rewrite',
	'git/pre-push'
];
export const loadedEvents = new Map<string, HookitEvent>();

export function getEventByPath(eventPath: string): HookitEvent {
	let event: HookitEvent;
	if (loadedEvents.has(eventPath)) {
		event = loadedEvents.get(eventPath);
	} else {
		const names = eventPath.split('/');
		const categoryName = names[0];
		const eventName = names[1];
		if (customEventModules.has(categoryName)) {
			// this category is in a custom events module
			event = customEventModules.get(categoryName)[eventName];
		} else {
			// catergory is a default catergory
			// this will be a default event so we require it from our local files
			// since we use require instead of import to be synchronous we get
			// the default export because we know it is a ES5 module
			event = require('../events/' + eventPath).default;
		}

		if (event.prerequisite) {
			event.prerequisite();
		}
		loadedEvents.set(eventPath, event);
	}
	return event;
}

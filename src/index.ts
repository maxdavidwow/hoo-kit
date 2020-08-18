import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import { loadConfig } from './config';

// TODO: maybe this init function should be outsourced to a hookit-cli module
function init() {
	if (!loadConfig()) {
		// return if loading the config failed for whatever reason
		return;
	}
	startEventManger();
	startTaskManager();
}

init();

export * from './types';

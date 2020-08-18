import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import { loadConfig } from './config';

export * from './types';
export { addCustomEventsModule } from './event-system/custom-events';

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

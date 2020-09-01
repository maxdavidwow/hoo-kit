import { loadConfig } from './config';
import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import startUiServer from './ui-server/ui-server';
import { hookOntoProcessExit, mainProcess, MainProcessEvents } from './main-process';

export * from './types';
export { addCustomEventsModule } from './event-system/custom-events';

export default function init() {
	hookOntoProcessExit();
	if (!loadConfig()) {
		mainProcess.emit(MainProcessEvents.Close);
		return;
	}
	startEventManger();
	startTaskManager();
	startUiServer();
}

// if run from cli start up immediately
if (require.main === module) {
	init();
	// create a loop so node doesn't exit
	(function loop() {
		setTimeout(loop, 5000);
	})();
}

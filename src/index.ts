import { loadConfig } from './config';
import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import startUiServer from './ui-server/ui-server';
import { hookOntoProcessExit, mainProcess, MainProcessEvents } from './main-process';
import { waitForIpcInit } from './ipc';

export * from './types';
export { addCustomEventsModule } from './event-system/custom-events';

export default async function init() {
	try {
		hookOntoProcessExit();
		loadConfig();
		startEventManger();
		await waitForIpcInit();
		startTaskManager();
		startUiServer();
	} catch (err) {
		mainProcess.emit(MainProcessEvents.Close);
		throw err;
	}
}

const runFromCli = require.main === module;
const isRequiredFromBin = module.parent && module.parent.filename.endsWith('hoo-kit');
// if run from cli start up immediately
if (isRequiredFromBin || runFromCli) {
	console.log('start');
	init();
	// create a loop so node doesn't exit
	(function loop() {
		mainProcess.currentLoopTimeout = setTimeout(loop, 5000);
	})();
}

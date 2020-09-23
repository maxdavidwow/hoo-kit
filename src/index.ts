import { getArgument, loadConfig } from './config';
import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import startUiServer from './ui-server/ui-server';
import { hookOntoProcessExit, mainProcess, MainProcessEvents } from './main-process';
import { waitForIpcInit } from './ipc';

function init() {
	loadConfig();
	startEventManger();
	startTaskManager();
	startUiServer();
}

async function startup() {
	hookOntoProcessExit();
	try {
		await waitForIpcInit();

		// const runFromCli = require.main === module;
		// const isRequiredFromBin = module.parent && module.parent.filename.endsWith('hoo-kit');
		const skipDefaultInit = getArgument('skipDefaultInit');
		// if run from cli start up immediately
		if (!skipDefaultInit) {
			init();
			// create a loop so node doesn't exit
			(function loop() {
				mainProcess.currentLoopTimeout = setTimeout(loop, 5000);
			})();
		}
		console.log('hoo-kit running!');
	} catch (err) {
		mainProcess.emit(MainProcessEvents.Close);
		throw err;
	}
}

startup();

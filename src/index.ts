import { getArgument, loadConfig } from './config';
import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import startUiServer from './ui-server/ui-server';
import { hookOntoProcessExit, mainProcess, MainProcessEvents } from './main-process';
import { initIPC, waitForIpcInit } from './ipc';

export function initializeHookit() {
	startEventManger();
	startTaskManager();
	startUiServer();
}

async function startup() {
	hookOntoProcessExit();
	try {
		initIPC();
		await waitForIpcInit();

		const skipDefaultInit = getArgument('skipDefaultInit') === 'true';
		console.log(process.argv);
		// if run from cli start up immediately
		if (!skipDefaultInit) {
			loadConfig();
			initializeHookit();
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

const runFromCli = require.main === module;
const isRequiredFromBin = module.parent && module.parent.filename.endsWith('hoo-kit');
// dont startup when used as module import
if (runFromCli || isRequiredFromBin) {
	startup();
}

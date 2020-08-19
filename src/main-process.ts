import * as EventEmitter from 'events';

export const mainProcess = new EventEmitter.EventEmitter();

export enum MainProcessEvents {
	Close = 'close'
}

export function hookOntoProcessExit() {
	const onExit = () => {
		mainProcess.emit(MainProcessEvents.Close);
	};

	// we don't need this event yet since it will be called only
	// after node finished when node event loop is done wich menas
	// we also do
	// process.on('exit', onExit);

	// catches ctrl+c event
	process.on('SIGINT', onExit);

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', onExit);
	process.on('SIGUSR2', onExit);

	// catches uncaught exceptions
	process.on('uncaughtException', (error) => {
		onExit();
		// log uncaught error
		console.error(error);
	});
}

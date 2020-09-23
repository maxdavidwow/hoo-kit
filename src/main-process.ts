import * as treekill from 'tree-kill';

export enum MainProcessEvents {
	Close = 'close',
	AfterClose = 'after_close'
}

export class Process {
	public active = true;

	public currentLoopTimeout: NodeJS.Timeout;

	private listeners = new Map<string, (() => void)[]>();

	on(event: MainProcessEvents, cb: () => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(cb);
	}

	emit(event: MainProcessEvents, allRunCb?: () => void) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach((cb) => {
				cb();
			});
			if (allRunCb) {
				allRunCb();
			}
		}
	}
}

export const mainProcess = new Process();

export function exit() {
	mainProcess.active = false;
	console.log('Cleaning up...');
	mainProcess.emit(MainProcessEvents.Close, () => {
		// wait so termination events can be send
		setTimeout(() => {
			mainProcess.emit(MainProcessEvents.AfterClose, () => {
				clearTimeout(mainProcess.currentLoopTimeout);
			});
		}, 50);
	});
	treekill(process.pid, 'SIGKILL', () => {
		process.exit();
	});
}

export function hookOntoProcessExit() {
	// we don't need this event yet since it will be called only
	// after node finished when node event loop is done which menas
	// we also do
	// process.on('exit', onExit);

	// catches ctrl+c event
	process.on('SIGINT', exit);

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', exit);
	process.on('SIGUSR2', exit);

	// catches uncaught exceptions
	process.on('uncaughtException', (error) => {
		console.error(error);
		exit();
	});
}

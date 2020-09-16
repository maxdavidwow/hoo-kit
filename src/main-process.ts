export enum MainProcessEvents {
	Close = 'close'
}

class Process {
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

export function hookOntoProcessExit() {
	const onExit = () => {
		console.log('Cleaning up...');
		mainProcess.emit(MainProcessEvents.Close, () => {
			clearTimeout(mainProcess.currentLoopTimeout);
		});
	};

	// we don't need this event yet since it will be called only
	// after node finished when node event loop is done which menas
	// we also do
	// process.on('exit', onExit);

	// catches ctrl+c event
	process.on('SIGINT', onExit);

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', onExit);
	process.on('SIGUSR2', onExit);

	// catches uncaught exceptions
	process.on('uncaughtException', (error) => {
		console.error(error);
		onExit();
	});
}

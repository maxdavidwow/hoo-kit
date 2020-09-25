import { mainProcess } from '../main-process';
import { UUID } from '../types';
import { Terminal } from './terminal';

type TerminalRequestListener = (request: RemoteTerminalRequest) => void;

export const ipcListeners = new Map<string, TerminalRequestListener>();
export const ipcRequestListeners = new Map<string, TerminalRequestListener>();

export interface RemoteTerminalRequest {
	id: UUID;
	request: string;
	data?: unknown;
}

export class RemoteTerminal extends Terminal {
	constructor(title: string, command: string, stayAlive: boolean, onTerminated?: (instance: Terminal) => void) {
		super(title, command, stayAlive, onTerminated);
		ipcRequestListeners.set(this.id, (request) => {
			switch (request.request) {
				case 'terminated':
					this.handleTerminationEvent();
					break;
			}
		});
		this.startTerminal();
	}

	private sendRequest(request: string, data?: unknown) {
		const newRequest = {
			id: this.id,
			request,
			data
		} as RemoteTerminalRequest;
		ipcListeners.forEach((listener) => listener(newRequest));
	}

	startTerminal() {
		this.sendRequest('start', { title: this.title, command: this.command, stayAlive: this.stayAlive });
	}

	public terminate() {
		this.sendRequest('terminate', { shouldRespond: mainProcess.active });
	}

	private handleTerminationEvent() {
		if (this.onTerminated) {
			this.onTerminated(this);
		}
		ipcRequestListeners.delete(this.id);
	}
}

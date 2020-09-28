import { mainProcess } from '../main-process';
import { UUID } from '../types';
import { Session } from './session';

type SessionRequestListener = (request: RemoteSessionMessage) => void;

export const ipcListeners = new Map<string, SessionRequestListener>();
export const ipcRequestListeners = new Map<string, SessionRequestListener>();

export interface RemoteSessionMessage {
	id: UUID;
	type: string;
	data: {
		title: string;
		command: string;
		stayAlive: boolean;
	};
}

export class RemoteSession extends Session {
	constructor(title: string, command: string, stayAlive: boolean, onTerminated?: (instance: Session) => void) {
		super(title, command, stayAlive, onTerminated);
		ipcRequestListeners.set(this.id, (response) => {
			if (response.id !== this.id) {
				// response is not for this terminal
				return;
			}
			switch (response.type) {
				case 'terminated':
					this.handleTerminationEvent();
					break;
			}
		});
		this.startTerminal();
	}

	private sendRequest(type: string, data?: unknown) {
		const newRequest = {
			id: this.id,
			type,
			data
		} as RemoteSessionMessage;
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

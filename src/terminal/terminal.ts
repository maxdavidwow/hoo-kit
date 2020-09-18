import { ChildProcess, spawn } from 'child_process';
import ipc from '../ipc';
import { v4 as uuid } from 'uuid';
import { UUID } from '../types';
import { join } from 'path';
import { mainProcess } from '../main-process';

export class Terminal {
	private id: UUID;

	private spawner: ChildProcess;

	constructor(title: string, private command: string, private stayAlive: boolean, public onTerminated?: (instance: Terminal) => void) {
		this.id = uuid();
		ipc.on(this.id, this.handleTerminalMsg.bind(this), 'MSG_FROM_TERMINAL_' + this.id);
		this.spawner = spawn(`node ${join(__dirname, 'runInNode.js')} ${this.id} ${ipc.port} ${title}`, {
			shell: true,
			detached: true,
			stdio: 'ignore'
		});
	}

	public terminate() {
		this.sendToTerminal({ event: 'terminate', data: !mainProcess.active });
	}

	private handleTerminalMsg(event: string) {
		switch (event) {
			case 'ready':
				this.spawner.kill();
				this.spawner = null;
				this.sendToTerminal({ event: 'start', data: { command: this.command, stayAlive: this.stayAlive } });
				break;
			case 'terminated':
				this.handleTerminationEvent();
				break;
		}
	}

	private handleTerminationEvent() {
		ipc.off(this.id);
		if (this.onTerminated) {
			this.onTerminated(this);
		}
	}

	private sendToTerminal(data: unknown) {
		ipc.send({ event: 'MSG_TO_TERMINAL_' + this.id, data });
	}
}

import { ChildProcess, spawn } from 'child_process';
import { join } from 'path';
import mainIpc from '../ipc';
import { mainProcess } from '../main-process';
import { Terminal } from './terminal';

export class ExternalTerminal extends Terminal {
	private spawner: ChildProcess;

	constructor(title: string, command: string, stayAlive: boolean, onTerminated?: (instance: Terminal) => void) {
		super(title, command, stayAlive, onTerminated);
		this.startTerminal();
	}

	startTerminal() {
		mainIpc.on(this.id, this.handleTerminalMsg.bind(this), 'MSG_FROM_TERMINAL_' + this.id);
		this.spawner = spawn(`node ${join(__dirname, 'runInNode.js')} ${this.id} ${mainIpc.port} ${this.title}`, {
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
		mainIpc.off(this.id);
		if (this.onTerminated) {
			this.onTerminated(this);
		}
	}

	private sendToTerminal(data: unknown) {
		mainIpc.send({ event: 'MSG_TO_TERMINAL_' + this.id, data });
	}
}

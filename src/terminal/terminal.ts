import { ChildProcess } from 'child_process';

export class Terminal {
	public onTerminated?: () => void;

	constructor(private process: ChildProcess) {}

	public terminate() {
		this.process.kill();
		if (this.onTerminated) {
			this.onTerminated();
		}
	}
}

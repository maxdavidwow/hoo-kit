import { UUID } from '../types';
import { v4 as uuid } from 'uuid';

export abstract class Terminal {
	public id: UUID;

	constructor(
		public title: string,
		public command: string,
		public stayAlive: boolean,
		public onTerminated?: (instance: Terminal) => void
	) {
		this.id = uuid();
	}

	public abstract terminate();
}

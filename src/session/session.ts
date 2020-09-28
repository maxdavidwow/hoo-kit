import { UUID } from '../types';
import { v4 as uuid } from 'uuid';

export class Session {
	public id: UUID;

	constructor(
		public title: string,
		public command: string,
		public stayAlive: boolean,
		public onTerminated?: (instance: Session) => void
	) {
		this.id = uuid();
	}

	public terminate() {
		throw new Error('Implement terminate functionality.');
	}
}

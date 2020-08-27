import { Component, Input } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';

@Component({
	selector: 'hookit-sessions',
	templateUrl: './sessions.component.html',
	styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent {
	@Input() taskName;
	@Input() sessions = [];

	constructor(private server: ServerService) {}

	terminateSession(taskName: string, index: number) {
		this.server.call('terminateSession', { taskName, index });
	}
}

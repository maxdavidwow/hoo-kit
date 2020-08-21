import { Component } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';

@Component({
	selector: 'app-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
	tasks;
	constructor(private server: ServerService) {}

	saveTask(taskName: string) {
		this.server.call('saveTask', { taskName });
	}
}

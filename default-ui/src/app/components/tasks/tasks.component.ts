import { Component } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';

@Component({
	selector: 'hookit-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
	tasks = this.server.resourceStream('tasks');

	constructor(private server: ServerService) {
		this.tasks.subscribe((response) => console.log(response));
	}

	saveTask(taskName: string) {
		this.server.call('saveTask', { taskName });
	}
}

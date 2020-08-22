import { Component } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';
import { HookitTask } from '../../../../../src/types';

@Component({
	selector: 'hookit-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
	selectedTask: string;
	tasks = this.server.resourceStream<HookitTask[]>('tasks');

	constructor(private server: ServerService) {}

	saveTask(taskName: string) {
		this.server.call('saveTask', { taskName });
	}
}

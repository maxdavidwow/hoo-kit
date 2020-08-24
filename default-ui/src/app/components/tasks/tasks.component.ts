import { Component } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';
import { TaskInstance } from '../../../../../src/event-system/task-manager';

@Component({
	selector: 'hookit-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
	selectedTask: string = 'TestTaskV1';
	tasks = this.server.resourceStream<TaskInstance[]>('taskInstances');

	constructor(private server: ServerService) {}

	saveTask(taskName: string) {
		this.server.call('saveTask', { taskName });
	}

	terminateSession(index: number) {}
}

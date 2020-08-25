import { Component } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';
import { TaskInstance } from '../../../../../src/event-system/task-manager';
import { HookitTask } from '../../../../../src/types';

@Component({
	selector: 'hookit-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
	selectedTask: string = 'TestTaskV1';

	editTask: HookitTask;

	tasks = this.server.resourceStream<HookitTask[]>('tasks');
	instancesByName = new Map<string, TaskInstance>();

	constructor(private server: ServerService) {
		this.server.resourceStream<TaskInstance[]>('taskInstances').subscribe((instances) => {
			this.instancesByName = new Map();
			for (const instance of instances) {
				this.instancesByName.set(instance.task.name, instance);
			}
		});
	}

	saveTask(taskName: string) {
		this.server.call('saveTask', { taskName });
	}

	terminateSession(taskName: string, index: number) {
		this.server.call('terminateSession', { taskName, index });
	}
}

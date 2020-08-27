import { Component } from '@angular/core';
import { ServerService } from 'src/app/services/server/server.service';
import { TaskInstance } from '../../../../../src/event-system/task-manager';
import { HookitTask, TaskRetriggerStrategy, StopStrategy } from '../../../../../src/types';
import sync from 'css-animation-sync';

new sync('status-ripple').start();

@Component({
	selector: 'hookit-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
	// tslint:disable-next-line: no-inferrable-types
	selectedTask: string = 'TestTaskV2';
	edit = true;

	editTask: HookitTask;

	retriggerStrategies = Object.values(TaskRetriggerStrategy);
	stopStrategies = Object.values(StopStrategy);

	tasks = this.server.resourceStream<HookitTask[]>('tasks');
	instancesByName = new Map<string, TaskInstance>();

	tasksToUpdate: { [taskName: string]: boolean } = {};

	constructor(private server: ServerService) {
		this.trackTasks = this.trackTasks.bind(this);
		this.server.resourceStream<TaskInstance[]>('taskInstances').subscribe((instances) => {
			this.instancesByName = new Map();
			for (const instance of instances) {
				this.instancesByName.set(instance.task.name, instance);
			}
		});
	}

	saveTask(task: HookitTask) {
		this.server.call('saveTask', { taskName: task.name, task });
	}

	changeCommand(task: HookitTask, newCommand: string) {
		task.command = newCommand;
		// TODO: stop and reexecute task
		this.saveTask(task);
	}

	trackTasks(index: number, task: HookitTask) {
		const needsUpdate = this.tasksToUpdate[task.name];
		if (needsUpdate) {
			delete this.tasksToUpdate[task.name];
		}
		return needsUpdate ? false : index;
	}
}

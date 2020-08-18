import { HookitTask } from '../types';
import { getConfig } from '../config';
import { hook } from './hook-manager';

export default function () {
	readTasks();
	hookForAllTasks();
}

const tasks = new Map<string, HookitTask>();

function readTasks() {
	for (const task of getConfig().tasks) {
		tasks.set(task.name, task);
	}
}

function hookForAllTasks() {
	tasks.forEach((task) => {
		for (const eventDef of task.startEvents) {
			hook(eventDef.event, task);
		}
		if (task.stopEvents) {
			for (const eventDef of task.stopEvents) {
				hook(eventDef.event, task);
			}
		}
	});
}

export function getTaskByName(taskName: string) {
	return tasks.get(taskName);
}

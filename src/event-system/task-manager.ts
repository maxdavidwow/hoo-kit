import { HookitTask, UUID } from '../types';
import { getConfig } from '../config';
import { hook } from './hook-manager';

export default function () {
	readTasks();
	initAllTasks();
}

export const tasks = new Map<string, HookitTask>();

function readTasks() {
	for (const task of getConfig().tasks) {
		tasks.set(task.name, task);
	}
}

/**
 * Resembles the instance of an initialized task
 */
export class TaskInstance {
	startHooks: UUID[] = [];
	stopHooks: UUID[] = [];

	constructor(public task: HookitTask) {
		// bind these function so we only have 2 function pointers
		// instead of (hooks * 2) pointers
		this.runCommand = this.runCommand.bind(this);
		this.stop = this.stop.bind(this);
	}

	runCommand(output?: object) {
		// output is the optional object passed if the event returns something
		console.log('Run task: ' + this.task.name);
	}

	stop() {
		// stop execution of the terminal/child_process
		console.log('Stop task: ' + this.task.name);
	}
}
export const taskInstances = new Map<string, TaskInstance>();

function initAllTasks() {
	tasks.forEach((task) => {
		initTask(task);
	});
}

function initTask(task: HookitTask) {
	// create an instance for this task
	const taskInstance = new TaskInstance(task);
	taskInstances.set(task.name, taskInstance);

	// hook onto start end stop events
	for (const eventDef of task.startEvents) {
		const hookId = hook({
			taskName: task.name,
			eventPath: eventDef.event,
			callback: taskInstance.runCommand,
			args: eventDef.args
		});
		taskInstance.startHooks.push(hookId);
	}
	if (task.stopEvents) {
		for (const eventDef of task.stopEvents) {
			const hookId = hook({
				taskName: task.name,
				eventPath: eventDef.event,
				callback: taskInstance.stop,
				args: eventDef.args
			});
			taskInstance.stopHooks.push(hookId);
		}
	}
}

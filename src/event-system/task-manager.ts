import { HookitTask, UUID } from '../types';
import { getConfig } from '../config';
import { hook, unhook } from './hook-manager';
import { mainProcess, MainProcessEvents } from '../main-process';

export default function () {
	readTasks();
	initAllTasks();
}

mainProcess.on(MainProcessEvents.Close, cleanUpTasks);

function cleanUpTasks() {
	// unhook from all events for all task instances
	taskInstances.forEach((instance) => {
		for (const hookId of instance.startHooks) {
			unhook(hookId);
		}
		for (const hookId of instance.stopHooks) {
			unhook(hookId);
		}
	});
}

export const tasks = new Map<string, HookitTask>();

function readTasks() {
	for (const task of getConfig().tasks) {
		tasks.set(task.name, task);
	}
}

type Session = { id: UUID };

/**
 * Resembles the instance of an initialized task
 */
export class TaskInstance {
	startHooks: UUID[] = [];
	stopHooks: UUID[] = [];

	sessions: Session[] = [null, null, null];

	constructor(public task: HookitTask) {
		// bind these function so we only have 2 function pointers
		// instead of (hooks * 2) pointers
		this.runCommand = this.runCommand.bind(this);
		this.stop = this.stop.bind(this);
	}

	runCommand(output?: object) {
		// output is the optional object passed if the event returns something
		console.log('Run task: ' + this.task.name);
		// start execution of terminal/child_process
	}

	stop() {
		// stop execution of the terminal/child_process
		console.log('Stop task: ' + this.task.name);
	}
}
export const taskInstances = new Map<string, TaskInstance>();

function initAllTasks() {
	tasks.forEach((task) => {
		if (task.active) {
			initTask(task);
		}
	});
}

function initTask(task: HookitTask) {
	// create an instance for this task
	const taskInstance = new TaskInstance(task);
	taskInstances.set(task.name, taskInstance);

	// hook onto start end stop events
	for (const eventDef of task.startEvents) {
		const hookId = hook({
			eventPath: eventDef.event,
			callback: taskInstance.runCommand,
			args: eventDef.args
		});
		taskInstance.startHooks.push(hookId);
	}
	if (task.stopEvents) {
		for (const eventDef of task.stopEvents) {
			const hookId = hook({
				eventPath: eventDef.event,
				callback: taskInstance.stop,
				args: eventDef.args
			});
			taskInstance.stopHooks.push(hookId);
		}
	}
}

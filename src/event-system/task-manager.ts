import { HookitTask, UUID, TaskRetriggerStrategy, StopStrategy } from '../types';
import { getConfig } from '../config';
import { hook, unhook } from './hook-manager';
import { mainProcess, MainProcessEvents } from '../main-process';
import { spawn, ChildProcessByStdio, exec, ChildProcess, fork, execFile } from 'child_process';
import internal = require('stream');
import { v4 as uuid } from 'uuid';
import { notifyResourceChanged } from '../ui-server/ui-server';

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

const taskDefaults = {
	active: true,
	retriggerStrategy: TaskRetriggerStrategy.Restart,
	stopStrategy: StopStrategy.All,
	hideTerminal: false
};
function readTasks() {
	for (const task of getConfig().tasks) {
		tasks.set(task.name, { ...taskDefaults, ...task });
	}
}

/**
 * Resembles the instance of an initialized task
 */
export class TaskInstance {
	startHooks: UUID[] = [];
	stopHooks: UUID[] = [];

	sessions: number[] = [];

	constructor(public task: HookitTask) {
		// bind these function so we only have 2 function pointers
		// instead of (hooks * 2) pointers
		this.runCommand = this.runCommand.bind(this);
		this.stop = this.stop.bind(this);
	}

	runCommand(output?: string) {
		// output is the optional object passed if the event returns something
		const command = this.task.command.replace('${output}', output || '');

		// TODO
		// ubuntu like: gnome-terminal -- bash -c 'echo "Test"; bash' && echo $!
		// mac: TODO
		const process = exec(`wmic process call create "cmd.exe /K ${command}"`, {
			encoding: 'utf-8'
		});

		process.stdout.on('data', (data: string) => {
			console.log('data', data);
			if (data.includes('ProcessId')) {
				const pid = data.substring(data.indexOf('ProcessId') + 12, data.indexOf(';'));
				this.sessions.push(Number(pid));
				notifyResourceChanged('taskInstances');
			}
		});
	}

	stop() {
		switch (this.task.stopStrategy) {
			case StopStrategy.All: {
				this.sessions.forEach(() => this.terminateSessionByIndex(0));
				break;
			}
			case StopStrategy.Newest: {
				this.terminateSessionByIndex(this.sessions.length - 1);
				break;
			}
			case StopStrategy.Oldest: {
				this.terminateSessionByIndex(0);
				break;
			}
		}
	}

	terminateSessionByIndex(index: number) {
		const sessionToTerminate = this.sessions.splice(index, 1)[0];

		// TODO
		// ubuntu like: kill pid
		// mac: TODO
		exec('taskkill /f /t /pid ' + sessionToTerminate);
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

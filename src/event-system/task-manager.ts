import { HookitTask, UUID, TaskRetriggerStrategy, StopStrategy } from '../types';
import { getConfig } from '../config';
import { hook, unhook } from './hook-manager';
import { mainProcess, MainProcessEvents } from '../main-process';
import { Session } from '../session/session';
import { TerminalSession } from '../session/terminalSession';
import { notifyResourceChanged, Resource } from '../resources';

export default function () {
	readTasks();
	initAllTasks();
}

let SessionClass: typeof Session = TerminalSession;
export function setSessionClass(sessionClass: typeof Session) {
	// TODO: maybe let devs load a external terminal class from file
	SessionClass = sessionClass;
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
		instance.terminateAllSessions();
	});
}

export const tasks = new Map<string, HookitTask>();

const taskDefaults = {
	active: true,
	retriggerStrategy: TaskRetriggerStrategy.Restart,
	stopStrategy: StopStrategy.All,
	hideTerminal: false,
	stayAlive: true
};
function readTasks() {
	for (const task of getConfig().tasks) {
		tasks.set(task.name, { ...taskDefaults, ...task });
	}
	notifyResourceChanged(Resource.Tasks);
}

/**
 * Resembles the instance of an initialized task
 */
export class TaskInstance {
	startHooks: UUID[] = [];
	stopHooks: UUID[] = [];

	sessions: Session[] = [];

	constructor(public task: HookitTask) {
		// bind these function so we only have 2 function pointers
		// instead of (hooks * 2) pointers
		this.runCommand = this.runCommand.bind(this);
		this.stop = this.stop.bind(this);
	}

	async runCommand(output?: string) {
		// output is the optional object passed if the event returns something
		try {
			if (this.task.retriggerStrategy === TaskRetriggerStrategy.Restart) {
				this.terminateAllSessions();
			}
			const command = this.task.command.replace('$hookit{output}', output);
			const session = new SessionClass(this.task.name, command, this.task.stayAlive, this.onTerminated.bind(this));
			this.sessions.push(session);
			notifyResourceChanged(Resource.TaskInstances);
		} catch (err) {
			console.error(err);
		}
	}

	async stop() {
		switch (this.task.stopStrategy) {
			case StopStrategy.All: {
				this.terminateAllSessions();
				break;
			}
			case StopStrategy.Newest: {
				await this.terminateSessionByIndex(this.sessions.length - 1);
				break;
			}
			case StopStrategy.Oldest: {
				await this.terminateSessionByIndex(0);
				break;
			}
		}
	}

	async terminateAllSessions() {
		for (const _ of this.sessions) {
			this.terminateSessionByIndex(0);
		}
	}

	terminateSessionByIndex(index: number) {
		this.sessions[index].terminate();
	}

	onTerminated(session: Session) {
		// remove session when closed
		const index = this.sessions.findIndex((s) => s === session);
		if (index >= 0) {
			this.sessions.splice(index, 1);
			notifyResourceChanged(Resource.TaskInstances);
		}
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
	for (const eventDef of task.startEvents) {
		const hookId = hook({
			eventPath: eventDef.event,
			callback: taskInstance.runCommand,
			args: eventDef.args
		});
		taskInstance.startHooks.push(hookId);
	}
}

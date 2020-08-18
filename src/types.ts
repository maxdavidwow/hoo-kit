export enum TaskRetriggerStrategy {
	Restart = 'restart',
	Add = 'add'
}

export type EventDefinition = { event: string; args?: object };

/**
 * hookit task wich is defined in the hookit.json config.
 */
export type HookitTask = {
	/** the name of the task */
	name: string;

	/** events that trigger the execution of the command */
	startEvents: EventDefinition[];

	/** events that stop the execution of the command */
	stopEvents?: EventDefinition[];

	/** the stragey to use if the startEvent triggers again after the task wa already started
	 * 'restart' stops the execution of the task and starts it again
	 * 'add' starts a new instance of the task
	 * default: 'restart'
	 */
	retriggerStrategy?: TaskRetriggerStrategy;

	/**
	 * command that will be run in a shell
	 */
	command: string;

	/** should the task run in an invisible shell
	 * default: false
	 */
	hideTerminal?: boolean;
};

/**
 * hookit config wich is defined in the hookit.json file.
 */
export type HookitConfig = {
	/** list of hookit task that will be loaded upon start */
	tasks?: HookitTask[];

	/** object where the defaults for a hookit task can be overwritten */
	defaults?: {
		retriggerStrategy?: TaskRetriggerStrategy;
		hideTerminal?: boolean;
	};
};

export type HookCallback = (output?: object) => void;

/**
 * hookit event wich can be defined in and exported from a node module.
 * 'args' refer to the arguments defined in the task json
 */
export type HookitEvent = {
	/** called once when hookit is started */
	prerequisite?(): boolean;

	/** called for every task that uses the event */
	subscribe(uuid: string, callback: HookCallback, args?: object): boolean;

	/** called for every task that does not use this event anymore (task deleted/modified or before the flush event) */
	unsubscribe?(uuid: string, args?: object): boolean;

	/**
	 * called once when hookit was stopped properly. Should be used to release locks (e.g. on files)
	 * or closing sockets and NOT for freeing resources like maps or objects
	 */
	flush?(): void;
};

export type UUID = string;

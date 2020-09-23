import { IPCMessage } from './ipc';
import { HookitConfig, UUID } from './types';
import { v4 as uuid } from 'uuid';

import { getConfig, setConfig } from './config';
import startEventManger from './event-system/event-manager';
import startTaskManager from './event-system/task-manager';
import startUiServer from './ui-server/ui-server';

export class ApiCall {
	id = uuid() as UUID;
	api: string;
	data?: unknown;
}

/**
 * calls 'setConfig' to set the hoo-kit config and send a
 * response with the id when the config is saved
 */
class SetConfig extends ApiCall {
	api = 'setConfig';

	constructor(hookitConfig: HookitConfig) {
		super();
		this.data = hookitConfig;
	}
}

/**
 * calls 'startEventManager' to start up the event-manager
 */
class StartEventManger extends ApiCall {
	api = 'startEventManager';
}

/**
 * calls 'startTaskManager' to start up the task-manager
 */
class StartTaskManger extends ApiCall {
	api = 'startTaskManager';
}

/**
 * calls 'startUiServer' to start up the ui-server
 */
class StartUiServer extends ApiCall {
	api = 'startUiServer';
}

export const HOOKIT_API = {
	SetConfig,
	StartEventManger,
	StartTaskManger,
	StartUiServer
};

const apiHandler: { [key: string]: (call: ApiCall, response: (msg: IPCMessage) => void) => void } = {
	setConfig(call, response) {
		setConfig(call.data, () => response({ event: call.id, data: getConfig() }));
	},
	startEventManager() {
		startEventManger();
	},
	startTaskManager() {
		startTaskManager();
	},
	startUiServer() {
		startUiServer();
	}
};

export function handleApiCall(call: ApiCall, response: (msg: IPCMessage) => void) {
	const apiFn = apiHandler[call.api];
	if (apiFn) {
		apiFn(call, response);
	}
}

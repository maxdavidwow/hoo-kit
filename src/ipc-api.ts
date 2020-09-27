import { IPCMessage } from './ipc';
import * as dgram from 'dgram';
import { HookitConfig, UUID } from './types';
import { v4 as uuid } from 'uuid';

import { setConfig } from './config';
import { initializeHookit } from '.';
import { setTerminalClass } from './event-system/task-manager';
import { ipcListeners, ipcRequestListeners, RemoteTerminal, RemoteTerminalMessage } from './terminal/remoteTerminal';
import { listenForResouceChange, Resource } from './resources';

export interface ApiCall {
	id: UUID;
	api: string;
	data?: unknown;
	subscription?: boolean;
}

// external
export class Api {
	client: dgram.Socket;

	private openApiCalls: {
		[key: string]: { handled: boolean; call: ApiCall; resolve?: (data?: unknown) => void; eventListener?: (data: unknown) => void };
	} = {};

	constructor(port: number, host: string, onConnected?: () => void) {
		this.client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
		this.client.on('message', (data) => {
			this.onResponse(JSON.parse(data.toString()));
		});
		this.client.connect(port, host, onConnected);
	}

	private onResponse(message: IPCMessage) {
		const callMeta = this.openApiCalls[message.event];
		if (!callMeta) {
			return;
		}
		if (!callMeta.handled) {
			// first response is resolve
			if (callMeta.resolve) {
				callMeta.resolve(message.data);
			}
			callMeta.handled = true;
		} else {
			// succeding calls are subscription responses
			if (callMeta.call.subscription && callMeta.eventListener) {
				callMeta.eventListener(message.data);
			}
		}
	}

	private send(call: ApiCall) {
		this.client.send(JSON.stringify({ event: 'HOOKIT_API_CALL', data: call }));
	}

	private async makeApiCall(api: string, data: unknown, eventListener?: (data: unknown) => void) {
		return new Promise((res) => {
			const call = { id: uuid(), api, data, subscription: !!eventListener } as ApiCall;
			this.openApiCalls[call.id] = { call, resolve: res, eventListener, handled: false };
			this.send(call);
		});
	}

	async setConfig(config: HookitConfig, saveFn: () => void) {
		await this.makeApiCall('setConfig', config, saveFn);
	}

	async initialize() {
		await this.makeApiCall('init', undefined);
	}

	async useRemoteTerminal(terminalRequestReceived: (msg: RemoteTerminalMessage) => void) {
		await this.makeApiCall('useRemoteTerminal', undefined, terminalRequestReceived);
	}

	async remoteTerminalResponse(msg: RemoteTerminalMessage) {
		await this.makeApiCall('remoteTerminalResponse', msg);
	}

	async subscribeForResourceChange(
		onResourceChanged: (resourceChange: { resourceData: unknown; resourceType: Resource }) => void,
		resource?: Resource
	) {
		await this.makeApiCall('subscribeForResourceChange', resource, onResourceChanged);
	}
}

// internal
const apiHandler: { [key: string]: (call: ApiCall, response: (msg: IPCMessage) => void) => void } = {
	setConfig(call, response) {
		setConfig(call.data, () => {
			console.log('TODO: implement onSaved');
		});
		response({ event: call.id, data: true });
	},
	init(call, response) {
		initializeHookit();
		response({ event: call.id, data: true });
	},
	useRemoteTerminal(call, response) {
		ipcListeners.set(call.id, (request: RemoteTerminalMessage) => response({ event: call.id, data: request }));
		setTerminalClass(RemoteTerminal);
		response({ event: call.id, data: true });
	},
	remoteTerminalResponse(call, response) {
		ipcRequestListeners.forEach((requestListener) => requestListener(call.data as RemoteTerminalMessage));
		response({ event: call.id, data: true });
	},
	subscribeForResourceChange(call, response) {
		listenForResouceChange(
			(resourceData, resourceType) => response({ event: call.id, data: { resourceData, resourceType } }),
			call.data as Resource
		);
		response({ event: call.id, data: true });
	}
};

export function handleApiCall(call: ApiCall, response: (msg: IPCMessage) => void) {
	const apiFn = apiHandler[call.api];
	if (apiFn) {
		apiFn(call, response);
	}
}

import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as WS from 'ws';
import * as url from 'url';
import { getArgument } from '../config';
import { mainProcess, MainProcessEvents } from '../main-process';
import { tasks, taskInstances } from '../event-system/task-manager';
import { defaultEvents } from '../event-system/event-manager';
import { customEventModules } from '../event-system/custom-events';
import { UUID, HookitTask } from '../types';
import { v4 as uuid, validate as validateUUID } from 'uuid';

// extending web socket type (really quirky types support for ws...)
type WebSocket = WS & { isAlive: boolean };

export type WSMessage = { id: UUID; action: string; actionPath?: string; error?: string; payload? };

const basePath = getArgument('customUiPath') || path.join(__dirname, '/default-ui');

export default function () {
	const runServerFlag = getArgument('runUiServer');
	if (runServerFlag !== undefined && !runServerFlag) {
		// don't start server
		return;
	}

	const address = (getArgument('uiServerAddress') || 'localhost:8080').split(':');

	// start server for ui
	const server = http
		.createServer((req, res) => {
			handleFileRequest(req, res);
		})
		.listen(address[1], address[0]);

	// start api websocket server
	const socketServer = new WS.Server({ server });
	socketServer.on('connection', (socket: WebSocket) => {
		socket.isAlive = true;
		socket.on('message', (data: string) => {
			let message: WSMessage;
			try {
				message = JSON.parse(data);
				if (!message) {
					throw 'Invalid message.';
				}
				if (!message.action) {
					throw 'No Action.';
				}
				if (!validateUUID(message.id)) {
					throw 'Inalid id.';
				}
			} catch (ex) {
				socket.send(JSON.stringify({ message, payload: undefined, error: ex }));
				return;
			}
			if (message.action === 'PONG') {
				socket.isAlive = true;
			} else {
				handleApiCall(message, socket);
			}
		});
	});

	const ping = () => {
		// iteralte over all sockets and check if they are still used
		socketServer.clients.forEach((socket: WebSocket) => {
			if (socket.isAlive === false) {
				return socket.terminate();
			}
			socket.isAlive = false;
			socket.send(JSON.stringify({ id: uuid(), action: 'PING' }));
		});
	};
	const pingInterval = setInterval(ping, 30000);
	socketServer.on('close', function close() {
		clearInterval(pingInterval);
	});

	mainProcess.on(MainProcessEvents.Close, () => {
		console.log('Shutting down UI-server');
		clearInterval(pingInterval);
		socketServer.close();
		server.close();
	});

	console.log('UI-Server running at http://' + address[0] + ':' + address[1]);
}

function handleFileRequest(req: http.IncomingMessage, res: http.ServerResponse) {
	// parse URL
	const parsedUrl = url.parse(req.url);
	// extract URL path
	const pathname = `.${parsedUrl.pathname}`;
	// based on the URL path, extract the file extention. e.g. .js, .doc, ...
	let ext = path.parse(pathname).ext;
	// maps file extention to MIME typere
	const map = {
		'.ico': 'image/x-icon',
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.json': 'application/json',
		'.css': 'text/css',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.wav': 'audio/wav',
		'.mp3': 'audio/mpeg',
		'.svg': 'image/svg+xml',
		'.pdf': 'application/pdf',
		'.doc': 'application/msword'
	};

	if (req.url.length <= 1) {
		// is basepath /
		req.url = '/index.html';
		ext = '.html';
	}
	const filepath = path.join(basePath + req.url);
	fs.exists(filepath, (exist) => {
		if (!exist) {
			// if the file is not found, return 404
			res.statusCode = 404;
			res.end(`File ${filepath} not found!`);
			return;
		}

		// read file from file system
		fs.readFile(filepath, (err, data) => {
			if (err) {
				res.statusCode = 500;
				res.end(`Error getting the file: ${err}.`);
			} else {
				// if the file is found, set Content-type and send data
				res.setHeader('Content-type', map[ext] || 'text/plain');
				res.end(data);
			}
		});
	});
}

async function handleApiCall(message: WSMessage, socket: WebSocket) {
	let error;
	let result;
	switch (message.action) {
		case 'OPEN_RESOURCE_STREAM': {
			// start streaming the resource
			// basically we listen for changes to the resource changes
			// on a running instance can only be made by methods

			// check if resource exists
			if (!api.resources[message.actionPath]) {
				error = 'Resource Not found.';
				break;
			}
			if (!resourceStreams.has(message.actionPath)) {
				// create resource stream instance
				resourceStreams.set(message.actionPath, []);
			}
			const streams = resourceStreams.get(message.actionPath);
			// we create a new message instance with the action changed to resource
			// since this will be the desired action for succeeding stream responses
			streams.push({
				message: { ...message, action: 'RESOURCE', payload: undefined },
				socket
			});
		}
		case 'RESOURCE': {
			if (api.resources[message.actionPath]) {
				result = api.resources[message.actionPath](message);
			} else {
				error = 'Resource Not found.';
			}
			break;
		}
		case 'CLOSE_RESOURCE_STREAM': {
			if (resourceStreams.has(message.action)) {
				const streams = resourceStreams.get(message.action);
				const ownStreamIndex = streams.findIndex((s) => s.message.id === message.id);
				streams.splice(ownStreamIndex, 1);
				if (streams.length > 0) {
					resourceStreams.delete(message.action);
				}
			}
			break;
		}

		case 'METHOD': {
			try {
				if (!api.methods[message.actionPath]) {
					throw 'Method not found.';
				}
				result = api.methods[message.actionPath](message);
			} catch (ex) {
				error = ex;
			}
			break;
		}

		default:
			error = 'Action: ' + message.action + ' not supported.';
	}

	message.error = error;
	message.payload = result;
	socket.send(JSON.stringify(message));
}

const resourceStreams = new Map<string, { message: WSMessage; socket: WebSocket }[]>();
function notifyResourceChanged(...resources: string[]) {
	// for every resource and every streaming socket
	for (const resource of resources) {
		const streams = resourceStreams.get(resource);
		for (const stream of streams) {
			setImmediate(handleApiCall.bind(this, stream.message, stream.socket));
		}
	}
}

export type EventList = {
	[namepsace: string]: string[];
};

const api = {
	resources: {
		tasks: () => {
			const entries = [];
			tasks.forEach((task) => {
				entries.push(task);
			});
			return entries;
		},
		taskInstances: () => {
			const entries = [];
			taskInstances.forEach((instance) => {
				entries.push(instance);
			});
			return entries;
		},
		events: () => {
			const events: EventList = {};
			events.default = defaultEvents;
			customEventModules.forEach((cem, moduleName) => {
				Object.keys(cem).forEach((eventName) => events[moduleName].push(eventName));
			});
			return events;
		}
	},

	methods: {
		saveTask: (message: WSMessage) => {
			const params = message.payload as { taskName: string; task: HookitTask };
			tasks.set(params.taskName, params.task);
			notifyResourceChanged('tasks');
			return true;
		},
		terminateSession: (message: WSMessage) => {
			const params = message.payload as { taskName: string; index: number };
			taskInstances.get(params.taskName).terminateSessionByIndex(params.index);
			notifyResourceChanged('taskInstances');
			return true;
		}
	}
};

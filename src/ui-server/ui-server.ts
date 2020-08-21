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
	const socketServer = new WS.Server({ host: address[0], port: address[1] });
	socketServer.on('connection', (socket) => {
		socket.isAlive = true;
		socket.on('message', () => (socket.isAlive = true));
		socket.on('message', handleApiCall);
	});

	const ping = () => {
		socketServer.clients.forEach((socket) => {
			if (socket.isAlive === false) return socket.terminate();
			socket.isAlive = false;
			socket.ping(null);
		});
	};
	const pingInterval = setInterval(ping, 30000);
	socketServer.on('close', function close() {
		clearInterval(pingInterval);
	});

	mainProcess.on(MainProcessEvents.Close, () => {
		console.log('Shutting down UI-server');
		clearInterval(pingInterval);
		socketServer.destroy();
		socketServer.close();
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

async function handleApiCall(req: http.IncomingMessage, res: http.ServerResponse) {
	const callElements = req.url.split('/api/')[1].split('/');
	const type = callElements[0];

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	res.setHeader('Content-type', 'application/json');

	// we allow all post requests
	if (req.method === 'OPTIONS') {
		res.statusCode = 200;
		res.end();
		return;
	}

	let error;
	let result;
	switch (type) {
		default: {
			const name = callElements[1];
			if (api[type][name]) {
				res.statusCode = 200;
				result = api[type][name](req);
			} else {
				error = 'Api Not found.';
			}
			break;
		}
	}
	// if promise
	if (result.then) {
		result = await result.then((r: string) => res.end(r));
	}

	res.end(
		JSON.stringify({
			error,
			result
		})
	);
}

function getJsonBody(req: http.IncomingMessage) {
	return new Promise((res) => {
		const chunks = [];
		req.on('data', (chunk) => {
			chunks.push(chunk);
		});
		req.on('end', () => {
			const data = String(Buffer.concat(chunks));
			console.log(data);
			res(JSON.parse(data));
		});
	});
}

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
			const events = {
				default: [],
				custom: []
			};
			events.default = [...defaultEvents];
			customEventModules.forEach((cem) => {
				Object.keys(cem).forEach((eventName) => events.custom.push(eventName));
			});
			return events;
		}
	},

	methods: {
		saveTask: async (req: http.IncomingMessage) => {
			const params = await getJsonBody(req);
			return params;
		}
	}
};

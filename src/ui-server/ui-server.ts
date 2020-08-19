import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import { getArgument } from '../config';
import { mainProcess, MainProcessEvents } from '../main-process';
import * as util from 'util';
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
			const isApiCall = req.url.startsWith('/api');

			if (isApiCall) {
				handleApiCall(req, res);
			} else {
				handleFileRequest(req, res);
			}
		})
		.listen(address[1], address[0]);

	mainProcess.on(MainProcessEvents.Close, () => {
		console.log('Shutting down Ui-server');
		server.close();
	});
	console.log('Ui-Server running at http://' + address[0] + ':' + address[1]);
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

		// if is a directory search for index file matching the extention
		// if (fs.statSync(filepath).isDirectory()) pathname += '/index' + ext;

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

function handleApiCall(req: http.IncomingMessage, res: http.ServerResponse) {
	const callElements = req.url.split('/api/')[1].split('/');
	const type = callElements[0];

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	// res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	res.setHeader('Content-type', 'application/json');

	switch (type) {
		default: {
			const name = callElements[1];
			if (api[type][name]) {
				res.statusCode = 200;
				res.end(api[type][name](req));
			} else {
				res.statusCode = 404;
				res.end('Api Not found.');
			}
			break;
		}
	}
}

const api = {
	resources: {
		tasks: () => {
			const entries = [];
			tasks.forEach((task) => {
				entries.push(task);
			});
			return JSON.stringify(entries);
		},
		taskInstances: () => {
			const entries = [];
			taskInstances.forEach((instance) => {
				entries.push(instance);
			});
			return JSON.stringify(entries);
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
			return JSON.stringify(events);
		}
	},

	methods: {}
};

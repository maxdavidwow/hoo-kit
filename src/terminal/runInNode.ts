import { spawn } from 'child_process';
import * as net from 'net';
import { IPCMessage } from '../ipc';

const ID = process.argv[2];

const PORT = Number(process.argv[3]);
const HOST = '127.0.0.1';

const TITLE = process.argv[4];

const client = new net.Socket();

function send(data: unknown) {
	setTimeout(() => {
		client.write(JSON.stringify(data));
	}, 1);
}
function sendEvent(event: string) {
	send({ event: 'MSG_FROM_TERMINAL_' + ID, data: event });
}

client.connect(PORT, HOST, () => {
	send({ event: 'SUBSCRIBE_FOR', data: 'MSG_TO_TERMINAL_' + ID });
	sendEvent('ready');
});

client.on('data', (data) => {
	const message = JSON.parse(data.toString()) as IPCMessage;

	const eventData = message.data as { event: string; data?: unknown };
	switch (eventData.event) {
		case 'start': {
			const startupParams = eventData.data as { command: string; stayAlive: boolean };
			runCommand(startupParams.command, startupParams.stayAlive);
			break;
		}
		case 'terminate': {
			terminate();
			break;
		}
	}
});

function terminate() {
	sendEvent('terminated');
	client.end();
	process.exit();
}

function runCommand(command: string, stayAlive: boolean) {
	const procc = spawn(command, { shell: true, stdio: 'inherit' });

	procc.on('exit', () => {
		// after command was executed
		if (!stayAlive) {
			terminate();
		}
	});

	setTitle(TITLE);

	if (stayAlive) {
		(function loop() {
			setTimeout(loop, 5000);
		})();
	}
}

function setTitle(title: string) {
	// set node terminal title
	// sometimes setting process.title instantly has no effect
	setTimeout(() => (process.title = process.argv[4]), 100);
}

// catches ctrl+c event
process.on('SIGINT', terminate);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', terminate);
process.on('SIGUSR2', terminate);
process.on('uncaughtException', terminate);

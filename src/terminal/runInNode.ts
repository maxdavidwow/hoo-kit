import { ChildProcess, spawn } from 'child_process';
import * as dgram from 'dgram';
import * as treekill from 'tree-kill';

const ID = process.argv[2];

const PORT = Number(process.argv[3]);
const HOST = '127.0.0.1';

const TITLE = process.argv[4];

const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

function send(event: string, data: unknown) {
	return new Promise((res) => {
		client.send(JSON.stringify({ event, data }), res);
	});
}
function sendEvent(event: string) {
	send('MSG_FROM_TERMINAL_' + ID, event);
}

client.on('message', (data) => {
	const message = JSON.parse(data.toString()) as { event: string; data: unknown };

	const eventData = message.data as { event: string; data?: unknown };
	switch (eventData.event) {
		case 'start': {
			const startupParams = eventData.data as { command: string; stayAlive: boolean };
			runCommand(startupParams.command, startupParams.stayAlive);
			break;
		}
		case 'terminate': {
			terminate(eventData.data as boolean);
			break;
		}
	}
});

client.connect(PORT, HOST, () => {
	send('SUBSCRIBE_FOR', 'MSG_TO_TERMINAL_' + ID);
	sendEvent('ready');
});

let commandProcess: ChildProcess;
function runCommand(command: string, stayAlive: boolean) {
	commandProcess = spawn(command, { shell: true, stdio: 'inherit' });

	commandProcess.on('exit', () => {
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

async function terminate(sendTerminated = true) {
	if (sendTerminated) {
		await sendEvent('terminated');
	}
	treekill(commandProcess.pid, 'SIGKILL', () => {
		process.exit();
	});
}

// catches ctrl+c event
process.on('SIGINT', terminate);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', terminate);
process.on('SIGUSR2', terminate);
process.on('uncaughtException', terminate);

setTitle(TITLE);

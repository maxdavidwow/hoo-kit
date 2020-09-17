import * as dgram from 'dgram';
import { getArgument } from './config';
import { mainProcess, MainProcessEvents } from './main-process';
import { UUID } from './types';

const port = Number(getArgument('udpPort') || '41234');

type ListenerCallback = (data: unknown) => void;

type IPCMessage = { event: string; data: unknown };

class IPC {
	public port = port;

	private listeners = new Map<string, { filter?: string; cb: ListenerCallback }>();

	private server: dgram.Socket;

	constructor() {
		this.initUdpServer();
	}

	initUdpServer() {
		this.server = dgram.createSocket('udp4');

		this.server.on('error', (err) => {
			console.log(`ipc server error:\n${err.stack}`);
			this.server.close();
			this.server = null;
		});

		this.server.on('message', (msg) => {
			this.triggerListeners(msg);
		});

		this.server.on('listening', () => {
			console.log('Listening for events.');
		});

		this.server.bind(port);

		mainProcess.on(MainProcessEvents.Close, () => {
			if (this.server) {
				console.log('Shutting down ipc');
				this.server.close();
				this.server = null;
			}
		});
	}

	triggerListeners(msg: Buffer) {
		const message = JSON.parse(msg.toString()) as IPCMessage;
		if (message.event) {
			this.listeners.forEach((listener) => {
				if (listener.filter) {
					if (listener.filter !== message.event) {
						return;
					}
				}
				listener.cb(message.data);
			});
		} else {
			console.log('invalid ipc message received', message);
		}
	}

	on(id: UUID, cb: ListenerCallback, filter?: string) {
		this.listeners.set(id, { filter, cb });
	}

	off(id: UUID) {
		this.listeners.delete(id);
	}

	send(msg: IPCMessage) {
		// broadcast
		this.server.send(JSON.stringify(msg));
	}
}

export default new IPC();

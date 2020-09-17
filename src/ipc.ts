import * as net from 'net';
import { getArgument } from './config';
import { mainProcess, MainProcessEvents } from './main-process';
import { UUID } from './types';

const port = Number(getArgument('ipcPort') || '41234');

type ListenerCallback = (data: unknown) => void;

export type IPCMessage = { event: string; data: unknown };

class IPC {
	public port = port;

	private subscribedClients = new Map<string, net.Socket[]>();

	private listeners = new Map<string, { filter?: string; cb: ListenerCallback }>();

	private server: net.Server;

	constructor() {
		this.initUdpServer();
	}

	initUdpServer() {
		this.server = net.createServer((client) => {
			client.on('data', (data) => {
				this.handleMsg(data, client);
			});
			client.on('error', (err) => {});
			client.on('close', () => {
				this.subscribedClients.forEach((sockets) => {
					// remove client from subcribers
					const index = sockets.findIndex((socket) => socket === client);
					if (index >= 0) {
						sockets.splice(index, 1);
					}
				});
			});
		});

		this.server.on('error', (err) => {
			console.log(`ipc server error:\n${err.stack}`);
			this.server.close();
			this.server = null;
		});

		this.server.on('listening', () => {
			console.log('Listening for events.');
		});

		this.server.listen(port);

		mainProcess.on(MainProcessEvents.Close, () => {
			if (this.server) {
				console.log('Shutting down ipc');
				this.server.close();
				this.server = null;
			}
		});
	}

	handleMsg(msg: Buffer, client: net.Socket) {
		try {
			const message = JSON.parse(msg.toString()) as IPCMessage;
			if (message.event) {
				if (message.event === 'SUBSCRIBE_FOR') {
					const eventToSubscribeFor = message.data as string;
					if (!this.subscribedClients.has(eventToSubscribeFor)) {
						this.subscribedClients.set(eventToSubscribeFor, []);
					}
					this.subscribedClients.get(eventToSubscribeFor).push(client);
					return;
				}
				this.listeners.forEach((listener) => {
					if (listener.filter) {
						if (listener.filter !== message.event) {
							return;
						}
					}
					listener.cb(message.data);
				});
			} else {
				throw 'No event in message';
			}
		} catch (ex) {
			console.log('invalid ipc message received', ex);
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
		const data = JSON.stringify(msg);
		const subscribers = this.subscribedClients.get(msg.event);
		if (subscribers) {
			subscribers.forEach((client) => {
				client.write(data, 'utf-8');
			});
		}
	}
}

export default new IPC();

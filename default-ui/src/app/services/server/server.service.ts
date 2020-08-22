import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { filter } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { Observable, Subscriber } from 'rxjs';

const DEVELOP = true;
const basePath = DEVELOP ? 'localhost:8080' : window.location.host;

type UUID = string;
type WSMessage = { id: UUID; action: string; actionPath?: string; error?: string; payload? };

function responseForId(id: UUID) {
	return filter((value: WSMessage) => value.id === id);
}

@Injectable({
	providedIn: 'root'
})
export class ServerService {
	private socket: WebSocketSubject<WSMessage>;

	private resourceStreams = new Map<string, { value; subscribers: Subscriber<unknown>[]; unsubscribe: () => void }>();

	constructor() {
		this.socket = webSocket('ws://' + basePath);
		this.socket.subscribe({
			next: this.handlePing.bind(this),
			closed: this.handleClose.bind(this),
			error: this.handleError.bind(this)
		});
	}

	private handlePing(message: WSMessage) {
		if (message.action === 'PING') {
			this.send('PONG');
		}
	}

	private handleClose(event) {
		console.warn('Websocket connection closed.', event);
	}

	private handleError(err) {
		console.warn('Websocket error.', err);
	}

	private async send(action: string, actionPath?: string, payload?) {
		const id = uuid();
		this.socket.next({ id, action, actionPath, payload });
		return await this.socket.pipe(responseForId(id)).toPromise();
	}

	async resource<T>(resource: string) {
		const response = await this.send('RESOURCE', resource);
		return response.payload as T;
	}

	resourceStream<T>(resource: string): Observable<T> {
		return new Observable((subscriber) => {
			let stream = this.resourceStreams.get(resource);
			if (stream) {
				if (stream.value !== undefined) {
					subscriber.next(stream.value);
				}
			} else {
				// init resource stream
				const id = uuid();
				this.socket.next({ id, action: 'OPEN_RESOURCE_STREAM', actionPath: resource });
				const subscribtion = this.socket.pipe(responseForId(id)).subscribe((message) => {
					stream.value = message.payload;
					for (const sub of stream.subscribers) {
						sub.next(stream.value);
					}
				});
				stream = { value: undefined, subscribers: [], unsubscribe: subscribtion.unsubscribe };
				this.resourceStreams.set(resource, stream);
			}
			stream.subscribers.push(subscriber);
			return {
				unsubscribe: () => {
					// remove subscriber from map
					const index = stream.subscribers.findIndex((sub) => sub === subscriber);
					stream.subscribers.splice(index, 1);
					if (stream.subscribers.length === 0) {
						// if no observer left close stream
						stream.unsubscribe();
						this.send('CLOSE_RESOURCE_STREAM', resource);
						this.resourceStreams.delete(resource);
					}
				}
			};
		});
	}

	async call<T>(method: string, args: object) {
		const response = await this.send('METHOD', method, args);
		return response.payload as T;
	}
}

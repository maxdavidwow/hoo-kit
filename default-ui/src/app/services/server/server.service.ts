import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

const DEVELOP = true;
const basePath = DEVELOP ? 'localhost:8080' : window.location.host;

@Injectable({
	providedIn: 'root'
})
export class ServerService {
	private socket: WebSocketSubject<string>;

	constructor(private http: HttpClient) {
		this.socket = webSocket('ws://' + basePath);
		this.socket.asObservable().subscribe(this.handleSocketMessage.bind(this));
	}

	private handleSocketMessage(message: string) {
		console.log(message);
	}

	async resource<T>(resource: string) {
		return await this.http.post<T>(basePath + 'resources/' + resource, undefined).toPromise();
	}

	async call<T>(method: string, args: object) {
		return (await this.http.post(basePath + 'methods/' + method, args).toPromise()) as T;
	}
}

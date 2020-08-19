import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const DEVELOP = true;
const basePath = (DEVELOP ? 'http://localhost:8080' : window.location.origin) + '/api/';

@Injectable({
	providedIn: 'root'
})
export class ServerService {
	constructor(private http: HttpClient) {}

	async get<T>(resource: string) {
		return await this.http.get<T>(basePath + 'resources/' + resource).toPromise();
	}

	async post<T>(method: string, args: object) {
		return (await this.http.post(basePath + 'methods/' + method, args).toPromise()) as T;
	}
}

import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { EventList } from '../../../../../src/ui-server/ui-server';
import { ServerService } from 'src/app/services/server/server.service';
import { EventDefinition } from '../../../../../src/types';

@Component({
	selector: 'hookit-events',
	templateUrl: './events.component.html',
	styleUrls: ['./events.component.scss']
})
export class EventsComponent {
	active = true;

	edit: EventDefinition = { event: 'none' };

	selectedEvent: string;

	private _events: EventDefinition[];
	@Input()
	set events(events: EventDefinition[]) {
		this._events = events;
		this.updateAvailableEvents();
	}
	get events() {
		return this._events;
	}
	@Output() eventsChange = new EventEmitter<EventDefinition[]>();

	availableEvents: { group: string; events: string[] }[] = [];
	private allEvents: EventList = {};

	constructor(private server: ServerService) {
		this.server.resourceStream<EventList>('events').subscribe((events) => {
			this.allEvents = events;
			this.updateAvailableEvents();
		});
	}

	updateAvailableEvents() {
		if (!this.allEvents.default || !this.events) {
			return;
		}
		// there will always be default and custom arrays form the server
		const eventsByName = {};
		this.allEvents.default.concat(this.allEvents.custom || []).forEach((event) => (eventsByName[event] = true));
		for (const eventDef of this.events) {
			delete eventsByName[eventDef.event];
		}
		this.availableEvents = this.groupEvents(Object.keys(eventsByName));
	}

	groupEvents(events: string[]) {
		const sorted: EventList = {};
		for (const event of events) {
			const groupAndName = event.split('/');
			const group = groupAndName[0];
			const eventName = groupAndName[1];
			if (!sorted[group]) {
				sorted[group] = [];
			}
			sorted[group].push(eventName);
		}
		const sortedList = [];
		Object.keys(sorted).forEach((group) => {
			sortedList.push({ group, events: sorted[group] });
		});
		return sortedList;
	}
}

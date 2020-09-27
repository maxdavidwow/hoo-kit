import { customEventModules } from './event-system/custom-events';
import { defaultEvents } from './event-system/event-manager';
import { taskInstances, tasks } from './event-system/task-manager';

export enum Resource {
	Events = 'events',
	Tasks = 'tasks',
	TaskInstances = 'taskInstances'
}

type ResourceListener = (resourceData: unknown, resource?: Resource) => void;
const resourceListeners: { [resourceType: string]: ResourceListener[] } = {};

export function listenForResouceChange(listener: ResourceListener, resource?: Resource) {
	const key = resource || 'ALL';
	if (!resourceListeners[key]) {
		resourceListeners[key] = [];
	}
	resourceListeners[key].push(listener);
}

export function notifyResourceChanged(resource: Resource) {
	// merge resource bound and resource unspecific listeners
	const listeners = (resourceListeners.ALL || []).concat(resourceListeners[resource] || []);
	if (listeners) {
		const resourceData = getResource(resource);
		listeners.forEach((listener) => listener(resourceData, resource));
	}
}

export function getResource(resource: Resource): unknown {
	switch (resource) {
		case Resource.Events: {
			const events: { [namepsace: string]: string[] } = {};
			events.default = defaultEvents;
			customEventModules.forEach((cem, moduleName) => {
				Object.keys(cem).forEach((eventName) => events[moduleName].push(eventName));
			});
			return events;
		}
		case Resource.Tasks: {
			const entries = [];
			tasks.forEach((task) => {
				entries.push(task);
			});
			return entries;
		}
		case Resource.TaskInstances: {
			const entries = [];
			taskInstances.forEach((instance) => {
				entries.push(instance);
			});
			return entries;
		}
		default:
			return undefined;
	}
}

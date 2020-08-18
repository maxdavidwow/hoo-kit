import * as glob from 'glob';
import * as path from 'path';
import { HookitEvent } from '../types';

export type CustomEventModule = { [key: string]: HookitEvent };

export const customEventModules = new Map<string, CustomEventModule>();

export function requireCustomEventModules() {
	try {
		// require all custom event modules with the matching prefix hoo-kit-cem-
		const modulePaths = glob.sync('./node_modules/hoo-kit-cem-*');
		for (const relativeModulePath of modulePaths) {
			const customEventModule = ensureModule(require(path.resolve(relativeModulePath)));
			if (customEventModule) {
				const customEventModuleName = relativeModulePath.split('/hoo-kit-cem-')[1];
				customEventModules.set(customEventModuleName, customEventModule);
			}
		}
		console.log(`Added ${customEventModules.size} custom event module(s).`);
	} catch (ex) {
		console.log('Could not read custom event modules: ' + ex);
	}
}

function ensureModule(module): CustomEventModule {
	if (module instanceof Array) {
		for (const customEvent of module) {
			// customEvent should be an an object with the properties of CustomObject
			if (typeof customEvent === 'object') {
				// TODO: check for all properties
				// for now we just check if this is an object
				continue;
			}
			return null;
		}
	}
	return module;
}

export function addCustomEventsModule(module: CustomEventModule) {}

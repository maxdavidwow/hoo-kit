import * as path from 'path';
import * as fs from 'fs';
import { HookitConfig } from './types';
import * as parseArgs from 'minimist';

let config: HookitConfig;
export function loadConfig() {
	try {
		config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as HookitConfig;
		saveConfig = () => fs.writeFileSync(configPath, JSON.stringify(config));
	} catch (ex) {
		throw new Error('There is no valid hookit.json in this working directory.');
	}
}

export function setConfig(hookitConfig: HookitConfig, onSave: () => void) {
	config = hookitConfig;
	saveConfig = onSave;
}
export function getConfig(): HookitConfig {
	return config;
}

export let saveConfig: () => void;

const args = parseArgs(process.argv.slice(2));
export function getArgument(argumentName: string) {
	return args[argumentName];
}

const configPath = args._[0] || path.join(process.cwd(), 'hookit.json');

import * as path from 'path';
import * as fs from 'fs';
import { HookitConfig } from './types';
import * as parseArgs from 'minimist';

let config: HookitConfig;
export function loadConfig(): boolean {
	try {
		config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as HookitConfig;
		return true;
	} catch (ex) {
		console.log('There is no valid hookit.json in this working directory.');
		return false;
	}
}
export function getConfig(): HookitConfig {
	return config;
}
export function saveConfig() {
	fs.writeFileSync(configPath, JSON.stringify(config));
}

const args = parseArgs(process.argv.slice(2));
export function getArgument(argumentName: string) {
	return args[argumentName];
}

const configPath = args._[0] || path.join(process.cwd(), 'hookit.json');

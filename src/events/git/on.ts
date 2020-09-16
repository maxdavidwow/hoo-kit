import { HookitEvent, HookCallback } from '../../types';
import * as dgram from 'dgram';
import { getArgument } from '../../config';
import * as fs from 'fs';
import * as path from 'path';

let server: dgram.Socket;

const hooks = new Map<string, { callback: HookCallback; hooks: GitHook[] }>();

type GitHookResponse = { type: GitHook; msg: string };

type GitHook = string;

const gitHooks = [
	'applypatch-msg',
	'pre-applypatch',
	'post-applypatch',
	'pre-commit',
	'prepare-commit-msg',
	'commit-msg',
	'post-commit',
	'pre-rebase',
	'post-checkout',
	'post-merge',
	'pre-receive',
	'update',
	'post-receive',
	'post-update',
	'pre-auto-gc',
	'post-rewrite',
	'pre-push'
];

const port = Number(getArgument('gitUdpPort') || '41234');

export default {
	prerequisite() {
		// ensure that our hook script is in the every hook file
		for (const hook of gitHooks) {
			ensureGitHook(hook as GitHook);
		}

		// udp server so we can receive messages send from the git hook script
		server = dgram.createSocket('udp4');

		server.on('error', (err) => {
			console.log(`git udp server error:\n${err.stack}`);
			server.close();
		});

		server.on('message', (msg) => {
			// we replace ' with " since it is way too complicated in bash
			this.triggerAllHooks(JSON.parse(msg.toString().replace(/'/g, '"')));
		});

		server.bind(port);
		return true;
	},

	triggerAllHooks(message: GitHookResponse) {
		console.log(message);
		hooks.forEach((h) => {
			if (h.hooks.includes(message.type)) {
				h.callback(message.msg);
			}
		});
	},

	subscribe(uuid: string, callback: HookCallback, args: { hooks: GitHook[] }) {
		hooks.set(uuid, { callback, hooks: args.hooks });
		return true;
	},

	unsubscribe(uuid: string) {
		hooks.delete(uuid);
		return true;
	},

	flush() {
		server.close();
	}
} as HookitEvent;

let gitPath = String(getArgument('gitHooksPath') || '../../../../.git/hooks/');
gitPath = path.join(__dirname, gitPath);

const PREFIX = '# hookit-git-hook';

function ensureGitHook(hook: GitHook) {
	const hookPath = path.join(gitPath, hook);
	if (!fs.existsSync(hookPath)) {
		fs.writeFileSync(hookPath, '#!/bin/sh');
	}
	ensureScript(hook, hookPath);
}

function ensureScript(hook: GitHook, hookPath: string) {
	const fileText = fs.readFileSync(hookPath, 'utf8');
	const startIndex = fileText.indexOf(PREFIX);
	if (startIndex === -1) {
		insertScript(hook, hookPath, fileText);
	} else {
		ensureScriptIsUpToDate(hook, hookPath, fileText);
	}
}

function insertScript(hook: GitHook, hookPath: string, text: string) {
	fs.writeFileSync(hookPath, text + getScript(hook));
}

function ensureScriptIsUpToDate(hook: GitHook, hookPath: string, text: string) {
	if (text.indexOf(getScript(hook)) === -1) {
		// remove old hookit script is there is still one
		if (text.indexOf(PREFIX) >= 0) {
			text = removeScript(text);
		}
		insertScript(hook, hookPath, text);
	}
}

function removeScript(text: string) {
	const endTag = PREFIX + ': end';
	return text.replace(text.substring(text.indexOf(PREFIX) - 2, text.indexOf(endTag) + endTag.length), '');
}

function getScript(hook: GitHook) {
	// bash script that gets the first argument as message and sends
	// it and the hook type in a json format via udp to our server
	return (
		'\n\n' +
		`${PREFIX}: ${hook}` +
		'\n' +
		`HOOKIT_MSG=$1` +
		'\n' +
		`echo -n "{ 'type': '${hook}', 'msg': '$(cat "$HOOKIT_MSG")' }" >/dev/udp/127.0.0.1/${port}` +
		'\n' +
		`${PREFIX}: end`
	);
}

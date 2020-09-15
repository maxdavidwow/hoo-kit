import { HookitEvent, HookCallback } from '../../types';
import * as dgram from 'dgram';
import { getArgument } from '../../config';
import * as fs from 'fs';

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
		for (const hook in gitHooks) {
			// ensureGitHook(hook as GitHook);
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

const gitPath = 'D:/dev/hoo-kit/.git/hooks/';
const PREFIX = '# hookit-git-hook';

function ensureGitHook(hook: GitHook) {
	const path = gitPath + hook;
	if (!fs.existsSync(path)) {
		fs.writeFileSync(path, '#!/bin/sh');
	}
	const file = fs.readFileSync(path, 'utf8');
	const startIndex = file.indexOf(PREFIX);
	if (startIndex === -1) {
		insertScript(hook, path);
	}
}

function insertScript(hook: GitHook, path: string) {
	const script = `
	${PREFIX}: ${hook}
	MSG=$1
	echo -n "{ 'type': '${hook}', 'msg': '$(cat "$MSG")' }" >/dev/udp/127.0.0.1/${port}
	`;
}

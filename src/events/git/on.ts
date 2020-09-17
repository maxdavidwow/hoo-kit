import { HookitEvent, HookCallback } from '../../types';

import { getArgument } from '../../config';
import * as fs from 'fs';
import * as path from 'path';
import ipc from '../../ipc';

const hooks = new Map<string, { callback: HookCallback; hooks: GitHook[] }>();

type GitHookResponse = { type: GitHook; from: string; msg: string };

type GitHook = string;

const gitHooks = [
	'applypatch-msg',
	'pre-applypatch',
	'post-applypatch',
	'pre-commit',
	'pre-merge-commit',
	'prepare-commit-msg',
	'commit-msg',
	'post-commit',
	'pre-rebase',
	'post-checkout',
	'post-merge',
	'pre-push',
	'post-update',
	'push-to-checkout',
	'pre-auto-gc',
	'post-rewrite',
	'sendemail-validate'
];

export default {
	ipcId: 'GIT_ON_LISTENER',
	server: undefined,

	prerequisite() {
		// ensure that our hook script is in the every hook file
		for (const hook of gitHooks) {
			ensureGitHook(hook as GitHook);
		}

		ipc.on(
			this.ipcId,
			(data: GitHookResponse) => {
				this.triggerAllHooks(data);
			},
			'GIT/ON'
		);

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
		ipc.off(this.ipcId);
	}
} as HookitEvent;

let gitPath = String(getArgument('gitHooksPath') || path.join(process.cwd() + '/.git/hooks/'));
gitPath = path.resolve(gitPath);

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
		`echo -n "{ \"event\": \"GIT/ON\", \"data\": { \"type\": \"${hook}\", \"from\": \"${process.cwd()}\", \"msg\": \"\" } }" >/dev/udp/127.0.0.1/${
			ipc.port
		}` +
		'\n' +
		`${PREFIX}: end`
	);
}

import { HookitEvent, HookCallback } from '../../types';

const gitHooks = new Map<string, string>();

type GitHook =
	| 'applypatch-msg'
	| 'pre-applypatch'
	| 'post-applypatch'
	| 'pre-commit'
	| 'prepare-commit-msg'
	| 'commit-msg'
	| 'post-commit'
	| 'pre-rebase'
	| 'post-checkout'
	| 'post-merge'
	| 'pre-receive'
	| 'update'
	| 'post-receive'
	| 'post-update'
	| 'pre-auto-gc'
	| 'post-rewrite'
	| 'pre-push';

export default {
	prerequisite() {
		//
	},

	subscribe(uuid: string, callback: HookCallback, args: { hooks: GitHook[]; path: string; ignore?: string }) {
		return true;
	},

	unsubscribe(uuid: string) {
		gitHooks.get(uuid).close();
		gitHooks.delete(uuid);
		return true;
	}
} as HookitEvent;

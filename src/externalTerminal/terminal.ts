import * as cp from 'child_process';
import { env } from 'process';
import { exists } from 'fs';
import { platform } from 'os';

export class WindowsExternalTerminalService {
	private static readonly CMD = 'cmd.exe';

	private static _DEFAULT_TERMINAL_WINDOWS: string;

	public static getDefaultTerminalWindows(): string {
		if (!WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS) {
			const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
			WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${
				isWoW64 ? 'Sysnative' : 'System32'
			}\\cmd.exe`;
		}
		return WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS;
	}

	public static runInTerminal(title: string, args: string[], dir?: string, envVars?): Promise<number | undefined> {
		const exec = WindowsExternalTerminalService.getDefaultTerminalWindows();

		return new Promise<number | undefined>((resolve, reject) => {
			const command = `""${args.join('" "')}" & pause"`; // use '|' to only pause on non-zero exit code

			const cmdArgs = ['/c', 'start', title, '/wait', exec, '/c', command];

			// delete environment variables that have a null value
			Object.keys(env)
				.filter((v) => env[v] === null)
				.forEach((key) => delete env[key]);

			const cmd = cp.spawn(WindowsExternalTerminalService.CMD, cmdArgs, {
				cwd: dir,
				env: { ...process.env, ...envVars },
				windowsVerbatimArguments: true,
				stdio: 'ignore'
			});
			cmd.on('error', (err) => {
				reject(improveError(err));
			});

			resolve(undefined);
		});
	}
}

export class MacExternalTerminalService {
	public static DEFAULT_TERMINAL_OSX = 'Terminal.app';

	private static readonly OSASCRIPT = '/usr/bin/osascript'; // osascript is the AppleScript interpreter on OS X

	public static runInTerminal(title: string, args: string[], dir?: string, envVars?): Promise<number | undefined> {
		return new Promise<number | undefined>((resolve, reject) => {
			// On OS X we launch an AppleScript that creates (or reuses) a Terminal window
			// and then launches the program inside that window.

			const scriptpath = __dirname + '\\TerminalHelper.scpt';

			const osaArgs = [scriptpath, '-t', title, '-w', dir];

			for (const a of args) {
				osaArgs.push('-a');
				osaArgs.push(a);
			}

			if (envVars) {
				// tslint:disable-next-line: forin
				for (const key in envVars) {
					const value = envVars[key];
					if (value === null) {
						osaArgs.push('-u');
						osaArgs.push(key);
					} else {
						osaArgs.push('-e');
						osaArgs.push(`${key}=${value}`);
					}
				}
			}

			let stderr = '';
			const osa = cp.spawn(MacExternalTerminalService.OSASCRIPT, osaArgs);
			osa.on('error', (err) => {
				reject(improveError(err));
			});
			osa.stderr.on('data', (data) => {
				stderr += data.toString();
			});
			osa.on('exit', (code: number) => {
				if (code === 0) {
					// OK
					resolve(undefined);
				} else {
					if (stderr) {
						const lines = stderr.split('\n', 1);
						reject(new Error(lines[0]));
					} else {
						reject(new Error("Script '{0}' failed with exit code: " + code));
					}
				}
			});
		});
	}
}

export class LinuxExternalTerminalService {
	private static _DEFAULT_TERMINAL_LINUX_READY: Promise<string>;

	public static async getDefaultTerminalLinuxReady(): Promise<string> {
		if (!LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY) {
			LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY = new Promise(async (r) => {
				if (env.isLinux) {
					exists('/etc/debian_version', (isDebian) => {
						if (isDebian) {
							r('x-terminal-emulator');
						} else if (process.env.DESKTOP_SESSION === 'gnome' || process.env.DESKTOP_SESSION === 'gnome-classic') {
							r('gnome-terminal');
						} else if (process.env.DESKTOP_SESSION === 'kde-plasma') {
							r('konsole');
						} else if (process.env.COLORTERM) {
							r(process.env.COLORTERM);
						} else if (process.env.TERM) {
							r(process.env.TERM);
						} else {
							r('xterm');
						}
					});
				} else {
					r('xterm');
				}
			});
		}
		return LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY;
	}

	private static readonly WAIT_MESSAGE = 'Press any key to continue...';

	public static runInTerminal(title: string, args: string[], dir?: string, envVars?): Promise<number | undefined> {
		const execPromise = LinuxExternalTerminalService.getDefaultTerminalLinuxReady();

		return new Promise<number | undefined>((resolve, reject) => {
			const termArgs: string[] = [];
			// termArgs.push('--title');
			// termArgs.push(`"${TERMINAL_TITLE}"`);
			execPromise.then((exec) => {
				if (exec.indexOf('gnome-terminal') >= 0) {
					termArgs.push('-x');
				} else {
					termArgs.push('-e');
				}
				termArgs.push('bash');
				termArgs.push('-c');

				const bashCommand = `${quote(args)}; echo; read -p "${LinuxExternalTerminalService.WAIT_MESSAGE}" -n1;`;
				termArgs.push(`''${bashCommand}''`); // wrapping argument in two sets of ' because node is so "friendly" that it removes one set...

				// delete environment variables that have a null value
				Object.keys(env)
					.filter((v) => env[v] === null)
					.forEach((key) => delete env[key]);

				const options: any = {
					cwd: dir,
					env: { ...process.env, ...envVars }
				};

				let stderr = '';
				const cmd = cp.spawn(exec, termArgs, options);
				cmd.on('error', (err) => {
					reject(improveError(err));
				});
				cmd.stderr.on('data', (data) => {
					stderr += data.toString();
				});
				cmd.on('exit', (code: number) => {
					if (code === 0) {
						// OK
						resolve(undefined);
					} else {
						if (stderr) {
							const lines = stderr.split('\n', 1);
							reject(new Error(lines[0]));
						} else {
							reject(new Error('Failed with exit code: ' + code));
						}
					}
				});
			});
		});
	}
}

/**
 * tries to turn OS errors into more meaningful error messages
 */
function improveError(err: Error): Error {
	// tslint:disable-next-line: no-string-literal
	if ('errno' in err && err['errno'] === 'ENOENT' && 'path' in err && typeof err['path'] === 'string') {
		// tslint:disable-next-line: no-string-literal
		return new Error("can't find terminal application: " + err['path']);
	}
	return err;
}

/**
 * Quote args if necessary and combine into a space separated string.
 */
function quote(args: string[]): string {
	let r = '';
	for (const a of args) {
		if (a.indexOf(' ') >= 0) {
			r += '"' + a + '"';
		} else {
			r += a;
		}
		r += ' ';
	}
	return r;
}

export default async function runCommandsInTerminal(title: string, commands: string[], dir?: string, envVars?) {
	switch (platform()) {
		case 'win32':
			return WindowsExternalTerminalService.runInTerminal(title, commands, dir, envVars);
			break;
		case 'darwin':
			return MacExternalTerminalService.runInTerminal(title, commands, dir, envVars);
			break;
		default:
			return LinuxExternalTerminalService.runInTerminal(title, commands, dir, envVars);
			break;
	}
}

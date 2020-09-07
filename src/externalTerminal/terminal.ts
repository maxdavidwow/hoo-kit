import * as cp from 'child_process';
import { env } from 'process';
import { exists } from 'fs';
import { platform } from 'os';

export abstract class Terminal {
	pid: string;

	constructor(pid: string) {
		this.pid = pid;
	}

	public abstract terminate(): Promise<boolean>;
}

export class WindowsExternalTerminal extends Terminal {
	private static readonly CMD = 'cmd.exe';

	private static _DEFAULT_TERMINAL_WINDOWS: string;

	public static getDefaultTerminalWindows(): string {
		if (!WindowsExternalTerminal._DEFAULT_TERMINAL_WINDOWS) {
			const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
			WindowsExternalTerminal._DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${
				isWoW64 ? 'Sysnative' : 'System32'
			}\\cmd.exe`;
		}
		return WindowsExternalTerminal._DEFAULT_TERMINAL_WINDOWS;
	}

	public static runInTerminal(title: string, command: string, dir?: string, envVars?) {
		const exec = WindowsExternalTerminal.getDefaultTerminalWindows();

		return new Promise<WindowsExternalTerminal>((resolve, reject) => {
			const cmdArgs = ['/c', 'start', `"${title}"`, '/wait', exec, '/c', `"${command}"`];

			// delete environment variables that have a null value
			Object.keys(env)
				.filter((v) => env[v] === null)
				.forEach((key) => delete env[key]);

			const cmd = cp.spawn(WindowsExternalTerminal.CMD, cmdArgs, {
				cwd: dir,
				env: { ...process.env, ...envVars },
				windowsVerbatimArguments: true,
				stdio: 'ignore'
			});
			cmd.on('error', (err) => {
				reject(improveError(err));
			});

			setTimeout(async () => {
				try {
					const pid = await WindowsExternalTerminal.getPidForName(title);
					resolve(new WindowsExternalTerminal(pid));
				} catch (err) {
					reject(err);
				}
			}, 200);
		});
	}

	public static getPidForName(name: string) {
		return new Promise<string>((res, rej) => {
			const tasklist = cp.spawn('tasklist', ['/v', '/fi', '"ImageName eq cmd.exe"', '/fo', 'csv', '/nh'], {
				shell: true,
				stdio: ['ignore', 'pipe', 'ignore']
			});
			tasklist.stdout.setEncoding('utf-8');
			let tasklistOutput = '';
			tasklist.stdout.on('data', (chunk: string) => {
				tasklistOutput += chunk;
				let nameIndex = chunk.indexOf(name);
				if (nameIndex > -1) {
					nameIndex = tasklistOutput.indexOf(name);
					// found process
					let taskblock = tasklistOutput.substring(nameIndex - 400 || 0, nameIndex);
					// get last csv line
					taskblock = taskblock.substring(taskblock.lastIndexOf('"cmd.exe",') + 10);
					const pid = taskblock.substring(taskblock.indexOf('"') + 1, taskblock.indexOf(',') - 1);
					// end tasklist
					tasklist.kill();
					res(pid);
				}
			});
			tasklist.on('close', () => {
				rej(new Error('No PID found.'));
			});
		});
	}

	public terminate() {
		return new Promise<boolean>((res) => {
			cp.spawn('taskkill', ['/f', '/t', '/pid', this.pid], {
				shell: true,
				stdio: 'ignore'
			}).on('close', res.bind(this, true));
		});
	}
}

export class MacExternalTerminal extends Terminal {
	public static DEFAULT_TERMINAL_OSX = 'Terminal.app';

	private static readonly OSASCRIPT = '/usr/bin/osascript'; // osascript is the AppleScript interpreter on OS X

	public static runInTerminal(title: string, command: string, dir?: string, envVars?) {
		return new Promise<MacExternalTerminal>((resolve, reject) => {
			// On OS X we launch an AppleScript that creates (or reuses) a Terminal window
			// and then launches the program inside that window.

			const scriptpath = __dirname + '\\TerminalHelper.scpt';

			const osaArgs = [scriptpath, '-t', title, '-w', dir, command];

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
			const osa = cp.spawn(MacExternalTerminal.OSASCRIPT, osaArgs);
			osa.on('error', (err) => {
				reject(improveError(err));
			});
			osa.stderr.on('data', (data) => {
				stderr += data.toString();
			});
			osa.on('exit', (code: number) => {
				if (code === 0) {
					// OK
					resolve(new MacExternalTerminal(''));
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

	public terminate() {
		return new Promise<boolean>((res, rej) => {
			rej(new Error('Method not implemented.'));
		});
	}
}

export class LinuxExternalTerminal extends Terminal {
	private static _DEFAULT_TERMINAL_LINUX_READY: Promise<string>;

	public static async getDefaultTerminalLinuxReady(): Promise<string> {
		if (!LinuxExternalTerminal._DEFAULT_TERMINAL_LINUX_READY) {
			LinuxExternalTerminal._DEFAULT_TERMINAL_LINUX_READY = new Promise(async (r) => {
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
		return LinuxExternalTerminal._DEFAULT_TERMINAL_LINUX_READY;
	}

	private static readonly WAIT_MESSAGE = 'Press any key to continue...';

	public static runInTerminal(title: string, command: string, dir?: string, envVars?) {
		const execPromise = LinuxExternalTerminal.getDefaultTerminalLinuxReady();

		return new Promise<LinuxExternalTerminal>((resolve, reject) => {
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

				const bashCommand = `${command}; echo; read -p "${LinuxExternalTerminal.WAIT_MESSAGE}" -n1;`;
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
						resolve(new LinuxExternalTerminal(''));
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

	public terminate() {
		return new Promise<boolean>((res, rej) => {
			rej(new Error('Method not implemented.'));
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

export default async function runCommandInTerminal(title: string, command: string, dir?: string, envVars?): Promise<Terminal> {
	switch (platform()) {
		case 'win32':
			return WindowsExternalTerminal.runInTerminal(title, command, dir, envVars);
		case 'darwin':
			return MacExternalTerminal.runInTerminal(title, command, dir, envVars);
		default:
			return LinuxExternalTerminal.runInTerminal(title, command, dir, envVars);
	}
}

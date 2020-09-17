const cp = require('child_process');
const { title } = require('process');

const procc = cp.spawn('ngd serve', { shell: true, stdio: 'inherit' });

procc.on('message', (msg) => {
	console.log('message', msg);
});

procc.on('error', (err) => {
	console.log('error', err);
	// process.exit();
});

procc.on('disconnect', () => {
	console.log('disconnect');
});

procc.on('exit', () => {
	// after command was executed
	console.log('exit');
});

if (stayAlive) {
	let loopId;
	(function loop() {
		loopId = setTimeout(loop, 5000);
	})();
}

setTimeout(() => clearTimeout(loopId), 4000);

const cp = require('child_process');

const procc = cp.spawn('node test.js', { shell: true, detached: true, stdio: 'ignore' });
setTimeout(() => procc.kill(), 100);

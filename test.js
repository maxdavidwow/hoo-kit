const dgram = require('dgram');

const client = dgram.createSocket('udp4');
client.send(JSON.stringify({ type: process.argv[2], msg: process.argv[4] }), process.argv[3], 'localhost', () => {
	client.close();
});

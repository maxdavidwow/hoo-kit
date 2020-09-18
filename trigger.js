const dgram = require('dgram');

const PORT = 41234;
const HOST = '127.0.0.1';

const client = dgram.createSocket('udp4');

client.connect(PORT, HOST, () => {
	client.send(JSON.stringify({ event: 'HOOKIT_DEBUG', data: undefined }), PORT, HOST);
	client.close();
});

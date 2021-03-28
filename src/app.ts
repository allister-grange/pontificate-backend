import { socket } from './controllers/socket';

require('dotenv').config();

const fs = require('fs');

const PORT = process.env.PORT || 3000;

let options = {};

if (process.env.ENV === 'prod') {
  options = {
    key: fs.readFileSync('privkey.pem'),
    cert: fs.readFileSync('cert.pem'),
  };
}

const server = process.env.ENV === 'prod' ? require('https').createServer(options) : require('http').createServer(options);

const io = require('socket.io')(server, {
  cors: {
    origin: ['https://pontificate.click', 'https://www.pontificate.click', 'https://www.pontificate.click/', 'https://pontificate.click/', 'http://localhost:3005', 'http://192.168.0.22:3005'],
    methods: ['GET', 'POST'],
  },
});

socket(io);
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

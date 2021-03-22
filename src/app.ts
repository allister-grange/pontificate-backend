// import express from 'express';
// const http = require('http');

// import { socket } from './controllers/socket';
// const PORT = process.env.PORT || 3000;
// const index = require("./routes/index");

// const app = express();
// app.use(index);

// const server = http.createServer(app);
// socket(server);

// server.listen(PORT,'ec2-3-25-243-104.ap-southeast-2.compute.amazonaws.com' , () => console.log(`Listening on port ${PORT}`));

import { socket } from "./controllers/socket";

var fs = require('fs');
const PORT = process.env.PORT || 3000;

var options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('cert.pem')
};

var server = require('https').createServer(options);

socket(server)
server.listen(PORT,'0.0.0.0' , () => console.log(`Listening on port ${PORT}`));

// var io = require('socket.io').listen(app);
// app.listen(8150);


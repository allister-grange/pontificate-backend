import express from 'express';
const http = require('http');

import { socket } from './socket';
const PORT = process.env.PORT || 3000;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);
socket(server);

server.listen(PORT,() => console.log(`Listening on port ${PORT}`));
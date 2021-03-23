import e from "express";
import { socket } from "./controllers/socket";

let fs = require('fs');
const PORT = process.env.PORT || 3000;

let options = {};

if(process.env.ENV === 'prod'){
  options = {
    key: fs.readFileSync('privkey.pem'),
    cert: fs.readFileSync('cert.pem')
  };
}

let server = require('https').createServer(options);

socket(server);
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

import { socket } from "./controllers/socket";
import RedisClient from "./services/RedisClient";

require("dotenv").config();

const fs = require("fs");

const PORT = process.env.PORT || 3005;

let options = {};

if (process.env.ENV === "prod") {
  options = {
    key: fs.readFileSync("privkey.pem"),
    cert: fs.readFileSync("cert.pem"),
  };
}

// set up redis
(async () => {
  // const redis = createClient();

  // redis.on("error", (err) => console.log("Redis Client Error", err));

  // await redis.connect();
  RedisClient.initialiseConnection();

  const server =
    process.env.ENV === "prod"
      ? require("https").createServer(options)
      : require("http").createServer(options);

  const io = require("socket.io")(
    server,
    {
      cors: {
        origin: [
          "https://pontificate.click",
          "https://www.pontificate.click",
          "https://www.pontificate.click/",
          "https://pontificate.click/",
          "http://localhost:3000",
          "http://192.168.0.22:3000",
        ],
        methods: ["GET", "POST"],
      },
    },
    () => {
      console.log("should make it?");
    }
  );

  socket(io);
  server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
})();

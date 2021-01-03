import express from 'express';
const http = require('http');

const PORT = process.env.PORT || 3000;
const index = require("./routes/index");
const { getCurrentUser, userLeave, userJoin, getAllPlayersInGame } = require("./dummyuser");

const app = express();
app.use(index);

const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3005",
    methods: ["GET", "POST"]
  }
});

//can store players in an array for now 
//https://github.com/RishabhVerma098/gameappBackend/blob/master/server.js

io.on("connection", async (socket) => {

  console.log("New connection");
  

  socket.on("playerLobbyEvent", () => {
    //* create user
    const { gameId, userName } = socket.handshake.query;
    const user = userJoin(socket.id, userName, gameId);
    socket.join(user.game);
    const playersInGame = getAllPlayersInGame(gameId);
    console.log('Game ' + gameId + ' had player ' + userName + ' join');

    //* emit message to user to welcome them
    socket.emit("playerLobbyEvent", {
      userId: user.id,
      userName: user.userName,
      text: `Welcome ${user.userName}`,
      playersInGame: playersInGame
    });

    //* Broadcast message to everyone except user that he has joined
    socket.broadcast.to(user.game).emit("playerLobbyEvent", {
      userId: user.id,
      userName: user.userName,
      text: `${user.userName} has joined the game`,
      playersInGame: playersInGame
    });
  });

  // Disconnect , when user leave room
  socket.on("disconnect", () => {
    // delete user from users & emit that user has left the game
    const user = userLeave(socket.id);

    if (user) {
      console.log(`User ${user.userName} left the game`);
      
      io.to(user.room).emit("message", {
        userId: user.id,
        userName: user.userName,
        text: `${user.userName} has left the game`,
      });
    }
  });

});

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

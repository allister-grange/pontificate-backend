const { getCurrentUser, userLeave, userJoin,
  getAllPlayersInGame, setPlayerReadyStatus, setPointsOfPlayer } = require("../services/mockDBService");

export default app => {

  const io = require("socket.io")(app, {
    cors: {
      origin: "http://localhost:3005",
      methods: ["GET", "POST"]
    }
  });

  //can store players in an array for now 
  //https://github.com/RishabhVerma098/gameappBackend/blob/master/server.js
  io.on("connection", async (socket) => {

    console.log("New connection");

    socket.on("createNewLobbyEvent", data => {
      const { gameId } = data.query;
      console.log(`Creating a new game with id of ${gameId}`);
      socket.join(gameId);
    });

    socket.on("newPlayerLobbyEvent", data => {
      const { gameId, userName } = data.query;

      //* if the game doesn't exist yet then return a failure
      //* we only want users to create rooms from the 'new game' button
      if (!gameExists(gameId)) {
        //TODO error message to the client
        console.log(`game with id ${gameId} doesn't exist yet, cancelling game join for ${userName}`);
        return;
      }

      //* create user and put into temp storage (object for now, db soon)
      const user = userJoin(socket.id, userName, gameId);

      socket.join(user.gameId);
      const playersInGame = getAllPlayersInGame(gameId);
      console.log('Game ' + gameId + ' had player ' + userName + ' join');

      io.in(gameId).emit("newPlayerLobbyEvent", {
        userId: user.id,
        userName: user.userName,
        text: `${user.userName} has joined the game`,
        playersInGame: playersInGame
      });
    });

    socket.on("playerReadyEvent", data => {
      //* get user
      const user = getCurrentUser(socket.id);
      const { isPlayerReady } = data.query;

      if (!user) {
        console.error(`No user found with socket id of ${socket.id}`);
        return;
      }

      setPlayerReadyStatus(socket.id, isPlayerReady);

      console.log(`${user.userName} is now set to ready status ${user.isReady} in game ${user.gameId}`);
      const playersInGame = getAllPlayersInGame(user.gameId);

      //* emit message to all users that the player is ready
      io.in(user.gameId).emit("playerReadyEvent", {
        playersInGame
      });

    });

    socket.on("addPointToPlayerEvent", data => {
      //* get user
      const { points, userId } = data.query;
      const user = getCurrentUser(userId);

      if (!user) {
        console.error(`No user found with id of ${userId}`);
        return;
      }

      setPointsOfPlayer(userId, points);

      console.log(`${user.userName} now has ${user.points} points in game ${user.gameId}`);
      const playersInGame = getAllPlayersInGame(user.gameId);

      //* emit message to all users that the player is ready
      io.in(user.gameId).emit("pointsAddedToPlayerResponse", {
        playersInGame
      });

    });

    socket.on("startNewGameEvent", (data: any) => {

      const { gameId } = data.query;

      if (!gameExists(gameId)) {
        //TODO error message to the client
        console.log("game doesn't exist yet, cancelling game start");
        return;
      }

      const playersInGame = getAllPlayersInGame(gameId);

      console.log(`Starting game with id of ${gameId}`);

      io.in(gameId).emit("gameStartedEvent", { playersInGame });
    });

    socket.on("getCurrentPlayersInGameEvent", (data: any) => {

      const { gameId } = data.query;

      if (!gameExists(gameId)) {
        //TODO error message to the client
        console.log(`game doesn't exist yet, cannot return players for ${gameId}`);
        return;
      }

      console.log(`Getting all players in game with id of ${gameId}`);

      //this is probably inefficient, need to have redux on the front end holding the socketRef in state
      //as opposed to joining them into the room again when the game starts 
      socket.join(gameId);
      const playersInGame = getAllPlayersInGame(gameId);
      console.log(playersInGame);
      
      io.in(gameId).emit("playersInGame", { playersInGame });
    });

    // Disconnect , when user leaves game
    socket.on("disconnect", () => {
      // delete user from users & emit that user has left the game
      const user = userLeave(socket.id);

      if (user) {
        console.log(`User ${user.userName} left the game`);

        io.to(user.gameId).emit("message", {
          userId: user.id,
          userName: user.userName,
          text: `${user.userName} has left the game`,
        });
      }
    });

  });

  const gameExists = (gameId: string) => {
    return io.sockets.adapter.rooms.get(gameId);
  }

}

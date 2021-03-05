import { Player, TurnStatusOptions } from "../types";

import {
  getCurrentUser, userLeave, userJoin, getPlayerByUserName, setPlayerTurnStatus,
  getAllPlayersInGame, setPlayerReadyStatus, setPointsOfPlayer, changePlayerTurnStatus
} from "../services/mockDBService";


const GET_CURRENT_PLAYERS_IN_GAME_EVENT = "getCurrentPlayersInGameEvent";
const PLAYERS_IN_GAME_RESPONSE = "playersInGame"
const ADD_POINT_TO_PLAYER_EVENT = "addPointToPlayerEvent"
const POINTS_ADDED_TO_PLAYER_RESPONSE = "pointsAddedToPlayerResponse"
const CHANGE_TURN_STATUS_FOR_PLAYER = "changeTurnStatusForPlayer"
const SET_PLAYER_TURN_STATUS = "setPlayerTurnStatus"

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
      const { points, userName } = data.query;
      const user = getPlayerByUserName(userName);

      if (!user) {
        console.error(`No user found with username of ${userName}`);
        return;
      }

      setPointsOfPlayer(user.userName, points);

      console.log(`${user.userName} now has ${user.points} points in game ${user.gameId}`);
      const playersInGame = getAllPlayersInGame(user.gameId);

      //* emit message to all users that the player is ready
      io.in(user.gameId).emit(PLAYERS_IN_GAME_RESPONSE, {
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
      //set random player to be ready in the game, they will start first
      const player = playersInGame[Math.floor(Math.random() * playersInGame.length)];
      changePlayerTurnStatus(player, "ready");
      //todo clean this up, think of a better way, don't need to access twice
      const playersInGameAfterChange = getAllPlayersInGame(gameId);

      console.log(`Starting game with id of${gameId}`);

      io.in(gameId).emit("gameStartedEvent", { playersInGameAfterChange });
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

      io.in(gameId).emit(PLAYERS_IN_GAME_RESPONSE, { playersInGame });
    });

    socket.on(SET_PLAYER_TURN_STATUS, (data: any) => {
      const playerUserNameFromRequest = data.query.userName as string;
      const gameId = data.query.gameId as string;
      const turnStatus = data.query.turnStatus as TurnStatusOptions;

      const playersInGame = getAllPlayersInGame(gameId);
      const player = getPlayerByUserName(playerUserNameFromRequest);
      const nextPlayerToTakeTurn = findNextPlayerToTakeTurn(playersInGame, player);

      console.log(`Changing ${playerUserNameFromRequest} in game ${gameId} status to ${turnStatus}`);

      setPlayerTurnStatus(playerUserNameFromRequest, turnStatus);
      if(nextPlayerToTakeTurn) {
        setPlayerTurnStatus(nextPlayerToTakeTurn.userName, 'ready');
      }

      //todo print these out and see if they're necessary
      const playersInGamePostChange = getAllPlayersInGame(gameId);
      const playerPostChange = getPlayerByUserName(playerUserNameFromRequest);

      //* if someone's status changed from 'active' to 'waiting', set up the next person to play  
      if (nextPlayerToTakeTurn) {
        console.log(`next player to take a turn is ${nextPlayerToTakeTurn.userName}`);
        io.in(gameId).emit(CHANGE_TURN_STATUS_FOR_PLAYER, { player: nextPlayerToTakeTurn, turnStatus: 'ready' });
      }
      
      //* emit message to all users that the player's turn status has changed
      io.in(gameId).emit(PLAYERS_IN_GAME_RESPONSE, { playersInGame: playersInGamePostChange });
      io.in(gameId).emit(CHANGE_TURN_STATUS_FOR_PLAYER, { player: playerPostChange, turnStatus: turnStatus });
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

  const allPlayersWaiting = (players: Player[]): boolean => {
    return players.findIndex(toFind => toFind.turnStatus !== 'waiting') !== -1;
  }

  const findNextPlayerToTakeTurn = (playersInGame: Player[], player: Player): Player => {

    //only need to set a next player to take a turn if the current player is active and changing to 'waiting'
    console.log(`current player is ${player.userName}`);
    if (player.turnStatus === 'active') {

      const indexOfPlayer = playersInGame.findIndex(toFind => toFind.userName === player.userName);
      console.log(`index of player ${indexOfPlayer}`);
      console.log(`index of player I shall return ${indexOfPlayer + 1}`);

      // if the user is at the end of the array, give back the first player
      if (indexOfPlayer >= playersInGame.length - 1) {        
        return playersInGame[0]
      }
      else {
        return playersInGame[indexOfPlayer + 1]
      }
    }

  }

}

import { Player, TurnStatusOptions } from "../types";

import {
  getCurrentPlayer, kickPlayerFromGame, joinPlayer, getPlayerByUserName, setPlayerTurnStatus,
  getAllPlayersInGame, setPlayerReadyStatus, setPointsOfPlayer, changePlayerTurnStatus,
  setRandomPlayerCategory
} from "../services/mockDBService";

const PLAYERS_IN_GAME_RESPONSE = "playersInGame"
const ADD_POINT_TO_PLAYER_EVENT = "addPointToPlayerEvent"
const CHANGE_TURN_STATUS_FOR_PLAYER = "changeTurnStatusForPlayer"
const SET_PLAYER_TURN_STATUS = "setPlayerTurnStatus"
const CREATE_NEW_LOBBY_EVENT = "createNewLobbyEvent";
const PLAYER_READY_EVENT = "playerReadyEvent";

const DOES_GAME_EXIST_EVENT = "doesGameExistEvent";
const DOES_GAME_EXIST_RES = "doesGameExistRes";
const DOES_USERNAME_EXIST_EVENT = "doesUserNameExistEvent";
const DOES_USERNAME_EXIST_RES = "doesUserNameExistRes";
const START_NEW_GAME_EVENT = "startNewGameEvent";
const GET_CURRENT_PLAYERS_IN_GAME_EVENT = "getCurrentPlayersInGameEvent";

export default app => {

  const io = require("socket.io")(app, {
    cors: {
      origin: ['http://localhost:3005', 'http://192.168.1.84:3005'],
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", async (socket) => {

    console.log("New connection");

    socket.on(CREATE_NEW_LOBBY_EVENT, data => {
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

      //* create player and put into temp storage (object for now, db soon)
      const player = joinPlayer(socket.id, userName, gameId);

      socket.join(player.gameId);
      const playersInGame = getAllPlayersInGame(gameId);
      console.log('Game ' + gameId + ' had player ' + userName + ' join');

      io.in(gameId).emit("newPlayerLobbyEvent", {
        userId: player.id,
        userName: player.userName,
        text: `${player.userName} has joined the game`,
        playersInGame: playersInGame
      });
    });

    socket.on(PLAYER_READY_EVENT, data => {
      //* get player
      const player = getCurrentPlayer(socket.id);
      const { isPlayerReady } = data.query;

      if (!player) {
        console.error(`No player found with socket id of ${socket.id}`);
        return;
      }

      setPlayerReadyStatus(socket.id, isPlayerReady);

      console.log(`${player.userName} is now set to ready status ${player.isReady} in game ${player.gameId}`);
      const playersInGame = getAllPlayersInGame(player.gameId);

      //* emit message to all users that the player is ready
      io.in(player.gameId).emit("playerReadyEvent", {
        playersInGame
      });

    });

    socket.on(ADD_POINT_TO_PLAYER_EVENT, data => {
      //* get player
      const { points, userName } = data.query;
      const player = getPlayerByUserName(userName);

      if (!player) {
        console.error(`No player found with username of ${userName}`);
        return;
      }

      setPointsOfPlayer(player.userName, points);

      console.log(`${player.userName} now has ${player.points} points in game ${player.gameId}`);
      const playersInGame = getAllPlayersInGame(player.gameId);

      //* emit message to all users that the player is ready
      io.in(player.gameId).emit(PLAYERS_IN_GAME_RESPONSE, {
        playersInGame
      });
    });

    socket.on(START_NEW_GAME_EVENT, (data: any) => {

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

    socket.on(GET_CURRENT_PLAYERS_IN_GAME_EVENT, (data: any) => {

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
      if (nextPlayerToTakeTurn) {
        setPlayerTurnStatus(nextPlayerToTakeTurn.userName, 'ready');
      }

      //todo print these out and see if they're necessary
      const playersInGamePostChange = getAllPlayersInGame(gameId);
      const playerPostChange = getPlayerByUserName(playerUserNameFromRequest);

      //* if someone's status changed from 'active' to 'waiting', set up the next person to play  
      if (nextPlayerToTakeTurn) {
        console.log(`next player to take a turn is ${nextPlayerToTakeTurn.userName}`);
        setRandomPlayerCategory(playerUserNameFromRequest);
        io.in(gameId).emit(CHANGE_TURN_STATUS_FOR_PLAYER, { player: nextPlayerToTakeTurn, turnStatus: 'ready' });
      }

      //* emit message to all users that the player's turn status has changed
      io.in(gameId).emit(PLAYERS_IN_GAME_RESPONSE, { playersInGame: playersInGamePostChange });
      io.in(gameId).emit(CHANGE_TURN_STATUS_FOR_PLAYER, { player: playerPostChange, turnStatus: turnStatus });
    });

    socket.on(DOES_GAME_EXIST_EVENT, (data: any) => {
      const gameId = data.query.gameId as string;
      const gameExistsRes = gameExists(gameId);

      console.log(`Does game exist triggered ${gameId};${gameExistsRes}`);

      socket.emit(DOES_GAME_EXIST_RES, { gameExists: gameExistsRes });
    });

    socket.on(DOES_USERNAME_EXIST_EVENT, (data: any) => {
      const gameId = data.query.gameId as string;
      const userName = data.query.userName as string;

      console.log(`Does username exist triggered ${gameId};${userName}`);

      const playersInGame = getAllPlayersInGame(gameId);
      let userNameIsFreeInGame = true;

      playersInGame.forEach((player) => {
        if(player.userName === userName){
          userNameIsFreeInGame = false;
        }
      });

      console.log(`Does username exists is ${userNameIsFreeInGame}`);
      
      socket.emit(DOES_USERNAME_EXIST_RES, { userNameIsFree: userNameIsFreeInGame });
    });

    // Disconnect , when player leaves game
    socket.on("disconnect", () => {
      // delete player from users & emit that player has left the game
      const player = kickPlayerFromGame(socket.id);

      if (player) {
        console.log(`player ${player.userName} left the game`);

        io.to(player.gameId).emit("message", {
          userId: player.id,
          userName: player.userName,
          text: `${player.userName} has left the game`,
        });
      }
    });

  });

  const gameExists = (gameId: string): boolean => {
    return io.sockets.adapter.rooms.get(gameId);
  }

  const findNextPlayerToTakeTurn = (playersInGame: Player[], player: Player): Player => {

    //only need to set a next player to take a turn if the current player is active and changing to 'waiting'
    console.log(`current player is ${player.userName}`);
    if (player.turnStatus === 'active') {

      const indexOfPlayer = playersInGame.findIndex(toFind => toFind.userName === player.userName);
      console.log(`index of player ${indexOfPlayer}`);
      console.log(`index of player I shall return ${indexOfPlayer + 1}`);

      // if the player is at the end of the array, give back the first player
      if (indexOfPlayer >= playersInGame.length - 1) {
        return playersInGame[0]
      }
      else {
        return playersInGame[indexOfPlayer + 1]
      }
    }
  }

}

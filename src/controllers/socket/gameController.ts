import { DOES_GAME_EXIST_RES, DOES_USERNAME_EXIST_RES, GAME_OVER_RES, PLAYERS_IN_GAME_RESPONSE } from "../../constants/socketMessages";
import {
  kickPlayerFromGame, joinPlayer, getPlayerByUserName,
  getAllPlayersInGame, setPointsOfPlayer, changePlayerTurnStatus, getGame
} from "../../services/mockDBService";

const gameExists = (io: any, gameId: string): boolean => {
  return io.sockets.adapter.rooms.get(gameId);
}

export const disconnectPlayer = (io, socket) => {
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
}

export const doesUserNameExist = (socket, data) => {  
  if (!data){
    return
  }

  const gameId = data.query.gameId as string;
  const userName = data.query.userName as string;

  console.log(`Does username exist triggered ${gameId};${userName}`);

  const playersInGame = getAllPlayersInGame(gameId);
  let userNameIsFreeInGame = true;

  playersInGame.forEach((player) => {
    if (player.userName === userName) {
      userNameIsFreeInGame = false;
    }
  });

  console.log(`Does username exists is ${userNameIsFreeInGame}`);

  socket.emit(DOES_USERNAME_EXIST_RES, { userNameIsFree: userNameIsFreeInGame });
}

export const doesGameExistEvent = (io, socket, data) => {
  if (!data){
    return
  }

  const gameId = data.query.gameId as string;
  const gameExistsRes = gameExists(io, gameId);

  console.log(`Does game exist triggered ${gameId};${gameExistsRes}`);

  socket.emit(DOES_GAME_EXIST_RES, { gameExists: gameExistsRes });
}

export const newPlayerLobbyEvent = (io: any, socket: any, data: any) => {
  if (!data){
    return
  }

  const { gameId, userName } = data.query;

  //* if the game doesn't exist yet then return a failure
  //* we only want users to create rooms from the 'new game' button
  if (!gameExists(io, gameId)) {
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
}

export const addPointToPlayer = (io, socket, data) => {
  if (!data){
    return
  }

  //* get player
  const { points, userName } = data.query;
  const player = getPlayerByUserName(userName);

  if(!player){
    console.error(`No player found with userName ${userName}`);
  }
  
  //* if points are over the game limit then end the game
  const game = getGame(player.gameId)
  if(!game){
    console.error(`No games found with gameId ${player.gameId}`);
  }
  let gameOver = false;  
  game.players.forEach((player) => {    
    if(points >= game.pointsToWin){
      gameOver = true;
      return;
    }
  });
  
  if (gameOver) {
    console.log(`Hit the max point limit in game, ending game ${player.gameId}`);
    io.in(player.gameId).emit(GAME_OVER_RES, {
      gameId: player.gameId
    });
    return;
  }

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
}

export const startNewGameEvent = (io: any, socket: any, data: any) => {
  if(!data){
    return
  }
  const { gameId } = data.query;

  if (!gameExists(io, gameId)) {
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
}

export const getCurrentPlayersInGameEvent = (io, socket, data) => {
  const { gameId } = data.query;

  if (!gameExists(io, gameId)) {
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
}
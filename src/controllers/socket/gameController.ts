import { Server } from "socket.io";
import {
  DOES_GAME_EXIST_RES,
  DOES_USERNAME_EXIST_RES,
  GAME_OVER_RES,
  PLAYERS_IN_GAME_RESPONSE,
} from "../../constants/socketMessages";
import {
  joinPlayer,
  getPlayerByUserName,
  getAllPlayersInGame,
  setPointsOfPlayer,
  changePlayerTurnStatus,
  getGame,
  addWordToPlayer,
} from "../../services/GameService";

const gameExists = (io: any, gameId: string): boolean =>
  io.sockets.adapter.rooms.get(gameId);

export const disconnectPlayer = (io: any, socket: any) => {
  // delete player from users & emit that player has left the game
  // TODO only kick a player if the game's status is over
  // const player = kickPlayerFromGame(socket.id);
  // if (player) {
  //   console.log(`player ${player.userName} left the game`);
  //   io.to(player.gameId).emit('message', {
  //     userId: player.id,
  //     userName: player.userName,
  //     text: `${player.userName} has left the game`,
  //   });
  // }
};

export const connectPlayer = async (io: any, socket: any, data: any) => {
  console.log("connect player called");

  if (!data) {
    console.error("no data passed with connect player");
    return;
  }

  const gameId = data.query.gameId as string;
  const userName = data.query.userName as string;

  if (gameExists(io, gameId)) {
    console.log(`called, with ${gameId} : ${userName}`);
    await socket.join(gameId);
    const playersInGame = await getAllPlayersInGame(gameId);
    io.in(gameId).emit(PLAYERS_IN_GAME_RESPONSE, { playersInGame });
  }
};

export const doesUserNameExist = async (socket: any, data: any) => {
  if (!data) {
    return;
  }

  const gameId = data.query.gameId as string;
  const userName = data.query.userName as string;

  console.log(`Does username exist triggered ${gameId};${userName}`);

  const playersInGame = await getAllPlayersInGame(gameId);
  let userNameIsFreeInGame = true;

  playersInGame.forEach((player) => {
    if (player.userName === userName) {
      userNameIsFreeInGame = false;
    }
  });

  console.log(`Does username exists is ${userNameIsFreeInGame}`);

  socket.emit(DOES_USERNAME_EXIST_RES, {
    userNameIsFree: userNameIsFreeInGame,
  });
};

export const doesGameExistEvent = async (io: any, socket: any, data: any) => {
  if (!data) {
    return;
  }

  const gameId = data.query.gameId as string;
  const gameExistsRes = gameExists(io, gameId);
  let gameExistsInSocket = false;
  if (gameExistsRes) {
    gameExistsInSocket = true;
  }

  console.log(`Does game exist triggered ${gameId};${gameExistsInSocket}`);

  socket.emit(DOES_GAME_EXIST_RES, { gameExists: gameExistsInSocket });
};

export const newPlayerLobbyEvent = async (io: any, socket: any, data: any) => {
  if (!data) {
    return;
  }

  const { gameId, userName } = data.query;

  //* if the game doesn't exist yet then return a failure
  //* we only want users to create rooms from the 'new game' button
  if (!gameExists(io, gameId)) {
    // TODO error message to the client
    console.log(
      `game with id ${gameId} doesn't exist yet, cancelling game join for ${userName}`
    );
    return;
  }

  //* create player and put into temp storage (object for now, db soon)
  const player = await joinPlayer(socket.id, userName, gameId);

  socket.join(player.gameId);
  const playersInGame = await getAllPlayersInGame(gameId);
  console.log(`Game ${gameId} had player ${userName} join`);

  io.in(gameId).emit("newPlayerLobbyEvent", {
    userId: player.id,
    userName: player.userName,
    text: `${player.userName} has joined the game`,
    playersInGame,
  });
};

export const addPointToPlayer = async (io: any, data: any) => {
  if (!data) {
    return;
  }

  //* get player
  const { userName, word } = data.query;
  const player = await getPlayerByUserName(userName);

  if (!player) {
    console.error(`No player or game found with userName ${userName}`);
    return;
  }

  //* if points are over the game limit then end the game
  const game = await getGame(player.gameId);
  if (!game) {
    console.error(`No games found with gameId ${player.gameId}`);
    return;
  }

  const gameOver = player.points + 1 >= game.pointsToWin;

  if (gameOver) {
    console.log(
      `Hit the max point limit in game, ending game ${player.gameId}`
    );
    io.in(player.gameId).emit(GAME_OVER_RES, {
      player,
    });
    return;
  }

  await setPointsOfPlayer(player.userName, player.points + 1);
  await addWordToPlayer(player.userName, word);

  console.log(
    `${player.userName} now has ${player.points} points in game ${player.gameId}`
  );

  const playersInGame = await getAllPlayersInGame(player.gameId);

  //* emit message to all users that the player is ready
  io.in(player.gameId).emit(PLAYERS_IN_GAME_RESPONSE, {
    playersInGame,
  });
};

export const startNewGameEvent = async (io: any, socket: any, data: any) => {
  if (!data) {
    return;
  }
  const { gameId } = data.query;

  if (!gameExists(io, gameId)) {
    // TODO error message to the client
    console.log("game doesn't exist yet, cancelling game start");
    return;
  }

  const playersInGame = await getAllPlayersInGame(gameId);
  // set random player to be ready in the game, they will start first
  const player =
    playersInGame[Math.floor(Math.random() * playersInGame.length)];
  await changePlayerTurnStatus(player, "ready");
  // todo clean this up, think of a better way, don't need to access twice
  const playersInGameAfterChange = await getAllPlayersInGame(gameId);

  console.log(`Starting game with id of${gameId}`);

  io.in(gameId).emit("gameStartedEvent", { playersInGameAfterChange });
};

export const getCurrentPlayersInGameEvent = async (
  io: any,
  socket: any,
  data: any
) => {
  const { gameId } = data.query;

  if (!gameExists(io, gameId)) {
    // TODO error message to the client
    console.log(`game doesn't exist yet, cannot return players for ${gameId}`);
    return;
  }

  console.log(`Getting all players in game with id of ${gameId}`);

  // this is probably inefficient, need to have redux on the front end holding the socketRef in
  // state as opposed to joining them into the room again when the game starts
  socket.join(gameId);
  const playersInGame = await getAllPlayersInGame(gameId);

  io.in(gameId).emit(PLAYERS_IN_GAME_RESPONSE, { playersInGame });
};

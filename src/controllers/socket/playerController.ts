import {
  CHANGE_TURN_STATUS_FOR_PLAYER,
  PLAYERS_IN_GAME_RESPONSE,
} from "../../constants/socketMessages";
import {
  changePlayerTurnStatus,
  clearPlayersSkippedWords,
  createGame,
  getAllPlayersInGame,
  getPlayerByUserName,
  setPlayersTimeLeftInTurn,
  setPlayerTurnStatus,
  setRandomPlayerCategory,
  takeASecondOffAPlayerTimer,
} from "../../services/GameService";
import { Player, TurnStatusOptions, TURN_LENGTH } from "../../types";

export const createNewLobbyEvent = async (socket: any, data: any) => {
  if (!data) {
    return;
  }

  const { gameId, pointsToWin } = data.query;

  console.log(
    `Creating a new game with id of ${gameId} and points to win of ${pointsToWin}`
  );
  await createGame(gameId, pointsToWin);
  socket.join(gameId);
};

const findNextPlayerToTakeTurn = (
  playersInGame: Player[],
  player: Player
): Player | undefined => {
  // only need to set a next player to take a turn if the
  // current player is active and changing to 'waiting'
  console.log(`current player is ${player.userName}`);
  if (player.turnStatus === "active") {
    const indexOfPlayer = playersInGame.findIndex(
      (toFind) => toFind.userName === player.userName
    );
    console.log(`index of player ${indexOfPlayer}`);
    console.log(`index of player I shall return ${indexOfPlayer + 1}`);

    // if the player is at the end of the array, give back the first player
    if (indexOfPlayer >= playersInGame.length - 1) {
      return playersInGame[0];
    }

    return playersInGame[indexOfPlayer + 1];
  }

  return undefined;
};

export const playerReadyEvent = async (io: any, socket: any, data: any) => {
  if (!data) {
    return;
  }

  const { userName, isPlayerReady } = data.query;

  //* get player
  const player = await getPlayerByUserName(userName);

  if (!player) {
    console.error(`No player found with socket id of ${socket.id}`);
    return;
  }

  await setPlayerTurnStatus(userName, isPlayerReady ? "ready" : "waiting");

  console.log(
    `${player.userName} is now set status to ${
      isPlayerReady ? "ready" : "waiting"
    } in game ${player.gameId}`
  );

  const playersInGame = await getAllPlayersInGame(player.gameId);

  //* emit message to all users that the player is ready
  io.in(player.gameId).emit("playerReadyEvent", {
    playersInGame,
  });
};

export const setPlayerTurnStatusInGame = async (
  io: any,
  socket: any,
  data: any
) => {
  if (!data) {
    return;
  }

  const playerUserNameFromRequest = data.query.userName as string;
  const gameId = data.query.gameId as string;
  const turnStatus = data.query.turnStatus as TurnStatusOptions;

  const playersInGame = await getAllPlayersInGame(gameId);
  const player = await getPlayerByUserName(playerUserNameFromRequest);
  const nextPlayerToTakeTurn = findNextPlayerToTakeTurn(playersInGame, player!);

  console.log(
    `Changing ${playerUserNameFromRequest} in game ${gameId} status to ${turnStatus}`
  );

  //* if we're setting up a player to take a turn, we need to start their timer
  if (turnStatus === "active") {
    await startTimer(player!, io);
  }

  await setPlayerTurnStatus(playerUserNameFromRequest, turnStatus);

  const playersInGamePostChange = await getAllPlayersInGame(gameId);
  const playerPostChange = await getPlayerByUserName(playerUserNameFromRequest);

  //* if someone's status changed from 'active' to 'waiting', set up the next person to play
  if (nextPlayerToTakeTurn) {
    console.log(
      `next player to take a turn is ${nextPlayerToTakeTurn.userName}`
    );
    await setRandomPlayerCategory(playerUserNameFromRequest);
    io.in(gameId).emit(CHANGE_TURN_STATUS_FOR_PLAYER, {
      player: nextPlayerToTakeTurn,
      turnStatus: "ready",
    });
  }

  //* emit message to all users that the player's turn status has changed
  io.in(gameId).emit(PLAYERS_IN_GAME_RESPONSE, {
    playersInGame: playersInGamePostChange,
  });
  io.in(gameId).emit(CHANGE_TURN_STATUS_FOR_PLAYER, {
    player: playerPostChange,
    turnStatus,
  });
};


export const endPlayersTurn = async (
  io: any,
  socket: any,
  data: any
) => {
  const { userName } = data.query;
  const player = await getPlayerByUserName(userName);

  if(!player) {
    console.error("No player found with username ", userName);
    return;
  }

  let playersInGame = await getAllPlayersInGame(player.gameId);
  await changePlayerTurnStatus(player, "waiting");
  await clearPlayersSkippedWords(player);
  await setPlayersTimeLeftInTurn(player, -1);
  const nextPlayerToTakeTurn = findNextPlayerToTakeTurn(playersInGame, player!);

  if(nextPlayerToTakeTurn) {
    await setPlayerTurnStatus(nextPlayerToTakeTurn.userName, "ready");
  }

  playersInGame = await getAllPlayersInGame(player.gameId);

  io.in(player.gameId).emit(PLAYERS_IN_GAME_RESPONSE, { playersInGame });
};


const startTimer = async (player: Player, io: any) => {
  await setPlayersTimeLeftInTurn(player, TURN_LENGTH);

  var intervalId = setInterval(function () {
    tickTimerForPlayer(player, io, intervalId);
  }, 1000);
};

const tickTimerForPlayer = async (player: Player, io: any, intervalId: any) => {
  await takeASecondOffAPlayerTimer(player);

  if (player.timeLeftInTurn === 0) {
    clearInterval(intervalId);
  }

  const playersInGame = await getAllPlayersInGame(player.gameId);
  io.in(player.gameId).emit(PLAYERS_IN_GAME_RESPONSE, {
    playersInGame: playersInGame,
  });
};

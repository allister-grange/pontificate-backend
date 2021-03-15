import { CHANGE_TURN_STATUS_FOR_PLAYER, PLAYERS_IN_GAME_RESPONSE } from "../../constants/socketMessages";
import { createGame, getAllPlayersInGame, getCurrentPlayer, getPlayerByUserName, setPlayerReadyStatus, setPlayerTurnStatus, setRandomPlayerCategory } from "../../services/mockDBService";
import { Player, TurnStatusOptions } from "../../types";

export const createNewLobbyEvent = (socket: any, data: any) => {
  if (!data){
    return
  }

  const { gameId, pointsToWin } = data.query;

  console.log(`Creating a new game with id of ${gameId}`);
  createGame(gameId, pointsToWin);
  socket.join(gameId);
}

export const playerReadyEvent = (io: any, socket: any, data: any) => {
  if (!data) {
    return
  }

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
}

export const setPlayerTurnStatusInGame = (io, socket, data) => {
  if (!data){
    return
  }

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

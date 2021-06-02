import {
  Player, TurnStatusOptions, Category, CategoryList, Game,
} from '../types';

// TODO need to replace this with some sort of db
const players = [] as Player[];
const games = [] as Game[];

// Join player to chat
export function joinPlayer(id: string, userName: string, gameId: string): Player {
  const player = {
    id,
    userName,
    gameId,
    isReady: false,
    points: 0,
    turnStatus: 'waiting' as TurnStatusOptions,
  } as Player;

  player.category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;

  // if the player is already in the lobby (caused by refreshing in the lobby), don't
  // allow them to join
  const playerAlreadyInGame = players.find(
    (playerToFind) => player.userName === playerToFind.userName,
  );
  if (playerAlreadyInGame) {
    return playerAlreadyInGame;
  }

  players.push(player);
  const game = games.find((gameToFind) => gameId === gameToFind.gameId);
  if (game) {
    game.players.push(player);
  }

  return player;
}

export function getGame(gameId: string): Game {
  return games.find((game) => game.gameId === gameId);
}

export function createGame(gameId: string, pointsToWin: number) {
  games.push({ players: [], gameId, pointsToWin });
}

export function getCurrentPlayer(userName: string) {
  return players.find((player) => player.userName === userName);
}

export function getPlayerByUserName(userName: string): Player {
  return players.find((player) => player.userName === userName);
}

export function setPlayerReadyStatus(userName: string, isPlayerReady: boolean) {
  if (!userName || isPlayerReady === undefined) {
    console.error('ERROR: Incorrect arguments passed to setPlayerReadyStatus');
    console.error(`userName is ${userName}, isPlayerReady is ${isPlayerReady}`);
    return;
  }
  const player = getCurrentPlayer(userName);
  if (player) {
    player.isReady = isPlayerReady;
  }
}

export function setPointsOfPlayer(userName: string, points: number) {
  if (!userName || !points) {
    console.error('ERROR: Incorrect arguments passed to setPointsOfPlayer');
    return;
  }
  const player = getPlayerByUserName(userName);
  if (player) {
    player.points = points;
  }
}

export function setRandomPlayerCategory(userName: string) {
  if (!userName) {
    console.error('ERROR: Incorrect arguments passed to setPlayerCategory');
    return;
  }
  const player = getPlayerByUserName(userName);

  // make sure the player can't have the same category twice in a row
  let category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;
  while (category === player.category) {
    category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;
  }

  if (player) {
    player.category = category;
  }
}

export function setPlayerTurnStatus(playerUserName: string, turnStatus: TurnStatusOptions) {
  if (!playerUserName || !turnStatus) {
    console.error('ERROR: Incorrect arguments passed to setPlayerTurnStatus');
    return;
  }

  const playerInGame = getPlayerByUserName(playerUserName);

  if (playerInGame) {
    playerInGame.turnStatus = turnStatus;
  } else {
    console.error(`No user found in game ${playerInGame.gameId} with username ${playerInGame.userName}`);
  }
}

export function getAllPlayersInGame(gameId: string): Player[] {
  return players.filter((player) => player.gameId === gameId);
}

// Player leaves chat
export function kickPlayerFromGame(id: string): Player {
  const index = players.findIndex((player) => player.id === id);

  if (index !== -1) {
    return players.splice(index, 1)[0];
  }

  return null;
}

export function changePlayerTurnStatus(player: Player, status: TurnStatusOptions) {
  players.find((toFind) => toFind.id === player.id).turnStatus = status;
}

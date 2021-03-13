import { Player, TurnStatusOptions, Category, CategoryList } from "../types";

// TODO need to replace this with some sort of db
const players = [] as Player[];

// Join player to chat
export function joinPlayer(id: string, userName: string, gameId: string): Player {
  let player = {
    id, userName, gameId, isReady: false,
    points: 0, turnStatus: 'waiting' as TurnStatusOptions
  } as Player;

  player.category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;

  players.push(player);

  return player;
}

export function getCurrentPlayer(id: string) {
  return players.find((player) => player.id === id);
}

export function getPlayerByUserName(userName: string): Player {
  return players.find((player) => player.userName === userName);
}

export function setPlayerReadyStatus(id: string, isPlayerReady: boolean) {
  if (!id || isPlayerReady === undefined) {
    console.error("ERROR: Incorrect arguments passed to setPlayerReadyStatus");
    console.error(`ID is ${id}, isPlayerReady is ${isPlayerReady}`);
    return;
  }
  let player = getCurrentPlayer(id);
  if (player) {
    player.isReady = isPlayerReady;
  }
}

export function setPointsOfPlayer(userName: string, points: number) {
  if (!userName || !points) {
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
    return;
  }
  let player = getPlayerByUserName(userName);
  if (player) {
    player.points = points;
  }
}

export function setRandomPlayerCategory(userName: string) {
  if (!userName) {
    console.error("ERROR: Incorrect arguments passed to setPlayerCategory");
    return;
  }
  let player = getPlayerByUserName(userName);

  //make sure the player can't have the same category twice in a row
  let category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;
  while(category === player.category) {
    category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;
  }
  
  if (player) {
    player.category = category;
  }
}

export function setPlayerTurnStatus(playerUserName: string, turnStatus: TurnStatusOptions) {
  if (!playerUserName || !turnStatus) {
    console.error("ERROR: Incorrect arguments passed to setPlayerTurnStatus");
    return;
  }

  const playerInGame = getPlayerByUserName(playerUserName);

  if (playerInGame) {
    playerInGame.turnStatus = turnStatus;
  }
  else {
    console.error(`No user found in game ${playerInGame.gameId} with username ${playerInGame.userName}`)
  }
}

export function getAllPlayersInGame(gameId: string): Player[] {
  return players.filter((player) => player.gameId === gameId);
}

// Player leaves chat
export function kickPlayerFromGame(id: string) {
  const index = players.findIndex((player) => player.id === id);

  if (index !== -1) {
    return players.splice(index, 1)[0];
  }
}

export function changePlayerTurnStatus(player: Player, status: TurnStatusOptions) {
  players.find(toFind => toFind.id === player.id).turnStatus = status;
}
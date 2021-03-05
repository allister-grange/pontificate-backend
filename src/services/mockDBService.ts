import { Player, TurnStatusOptions, Category, CategoryList } from "../types";

// TODO need to replace this with some sort of db
const users = [] as Player[];

// Join user to chat
export function userJoin(id: string, userName: string, gameId: string) {
  let user = {
    id, userName, gameId, isReady: false,
    points: 0, turnStatus: 'waiting' as TurnStatusOptions
  } as Player;

  user.category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;

  users.push(user);

  return user;
}

export function getCurrentUser(id: string) {
  return users.find((user) => user.id === id);
}

export function getPlayerByUserName(userName: string): Player {
  return users.find((user) => user.userName === userName);
}

export function setPlayerReadyStatus(id: string, isPlayerReady: boolean) {
  if (!id || isPlayerReady === undefined) {
    console.error("ERROR: Incorrect arguments passed to setPlayerReadyStatus");
    console.error(`ID is ${id}, isPlayerReady is ${isPlayerReady}`);
    return;
  }
  let user = getCurrentUser(id);
  if (user) {
    user.isReady = isPlayerReady;
  }
}

export function setPointsOfPlayer(userName: string, points: number) {
  if (!userName || !points) {
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
    return;
  }
  let user = getPlayerByUserName(userName);
  if (user) {
    user.points = points;
  }
}

export function setRandomPlayerCategory(userName: string) {
  if (!userName) {
    console.error("ERROR: Incorrect arguments passed to setPlayerCategory");
    return;
  }
  let user = getPlayerByUserName(userName);

  //make sure the player can't have the same category twice in a row
  let category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;
  while(category === user.category) {
    category = CategoryList[Math.floor(Math.random() * CategoryList.length)] as Category;
  }
  
  if (user) {
    user.category = category;
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
  return users.filter((user) => user.gameId === gameId);
}

// User leaves chat
export function userLeave(id: string) {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

export function changePlayerTurnStatus(player: Player, status: TurnStatusOptions) {
  users.find(toFind => toFind.id === player.id).turnStatus = status;
}
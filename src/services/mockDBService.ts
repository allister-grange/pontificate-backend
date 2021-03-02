import { Player, TurnStatusOptions } from "../types";

// TODO need to replace this with some sort of db
const users = [] as Player[];

// Join user to chat
function userJoin(id, userName, gameId) {
  const user = { id, userName, gameId, isReady: false, points: 0, turnStatus: "waiting" as TurnStatusOptions};

  users.push(user);

  return user;
}

function getCurrentUser(id: string) {
  return users.find((user) => user.id === id);
}

function setPlayerReadyStatus(id: string, isPlayerReady: boolean) {
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

function setPointsOfPlayer(id: string, points: number) {
  if (!id || !points) {
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
    return;
  }
  let user = getCurrentUser(id);
  if (user) {
    user.points = points;
  }
}

function getAllPlayersInGame(gameId: string): Player[] {
  return users.filter((user) => user.gameId === gameId);
}

// User leaves chat
function userLeave(id: string) {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

function changePlayerTurnStatus(player: Player, status: TurnStatusOptions) {
  users.find(toFind => toFind.id === player.id).turnStatus = status;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getAllPlayersInGame,
  setPlayerReadyStatus,
  setPointsOfPlayer,
  changePlayerTurnStatus
};
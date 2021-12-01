import {
  Player,
  TurnStatusOptions,
  Category,
  CategoryList,
  Game,
} from "../types";

// TODO need to replace this with some sort of db
const players = [] as Player[];
const games = [] as Game[];

// Join player to chat
export function joinPlayer(
  id: string,
  userName: string,
  gameId: string
): Player {
  const player: Player = {
    id,
    userName,
    gameId,
    isReady: false,
    points: 0,
    turnStatus: "waiting" as TurnStatusOptions,
    words: [],
    category: undefined,
    game: undefined,
    timeLeftInTurn: -1,
    wordsSeenInRound: [],
  };

  player.category = CategoryList[
    Math.floor(Math.random() * CategoryList.length)
  ] as Category;

  // if the player is already in the lobby (caused by refreshing in the lobby), don't
  // allow them to join
  const playerAlreadyInGame = players.find(
    (playerToFind) => player.userName === playerToFind.userName
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

export function getGame(gameId: string): Game | undefined {
  return games.find((game) => game.gameId === gameId);
}

export function createGame(gameId: string, pointsToWin: number) {
  games.push({ players: [], gameId, pointsToWin });
}

export function getCurrentPlayer(userName: string) {
  return players.find((player) => player.userName === userName);
}

export function getPlayerByUserName(userName: string): Player | undefined {
  return players.find((player) => player.userName === userName);
}

export function setPlayerReadyStatus(userName: string, isPlayerReady: boolean) {
  if (!userName || isPlayerReady === undefined) {
    console.error("ERROR: Incorrect arguments passed to setPlayerReadyStatus");
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
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
    return;
  }
  const player = getPlayerByUserName(userName);
  if (player) {
    player.points = points;
  }
}

export function addWordToPlayer(userName: string, word: string) {
  if (!userName || !word) {
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
  }
  const player = getPlayerByUserName(userName);
  if (player) {
    player.words.push(word);
  }
}

export function setRandomPlayerCategory(userName: string) {
  if (!userName) {
    console.error("ERROR: Incorrect arguments passed to setPlayerCategory");
    return;
  }
  const player = getPlayerByUserName(userName);

  // make sure the player can't have the same category twice in a row
  let category = CategoryList[
    Math.floor(Math.random() * CategoryList.length)
  ] as Category;
  while (category === player!.category) {
    category = CategoryList[
      Math.floor(Math.random() * CategoryList.length)
    ] as Category;
  }

  if (player) {
    player.category = category;
  }
}

export function setPlayerTurnStatus(
  playerUserName: string,
  turnStatus: TurnStatusOptions
) {
  if (!playerUserName || !turnStatus) {
    console.error("ERROR: Incorrect arguments passed to setPlayerTurnStatus");
    return;
  }

  const playerInGame = getPlayerByUserName(playerUserName);

  if (playerInGame) {
    playerInGame.turnStatus = turnStatus;
  } else {
    console.error(
      `No user found in game ${playerInGame!.gameId} with username ${
        playerInGame!.userName
      }`
    );
  }
}

export function getAllPlayersInGame(gameId: string): Player[] {
  return players.filter((player) => player.gameId === gameId);
}

export const setPlayersTimeLeftInTurn = (player: Player, time: number) => {
  const playerInGame = players.find(
    (playerToFind) => playerToFind.userName === player.userName
  );

  // if the player is already active, don't start his timer again
  if (playerInGame && playerInGame.turnStatus != "active") {
    playerInGame.timeLeftInTurn = time;
  }
};

export const takeASecondOffAPlayerTimer = (player: Player) => {
  const playerInGame = players.find(
    (playerInGame) => player.userName === playerInGame.userName
  );

  if (playerInGame && player.timeLeftInTurn > 0) {
    playerInGame.timeLeftInTurn -= 1;
  }
};

// Player leaves chat
export function kickPlayerFromGame(id: string): Player | undefined {
  const index = players.findIndex((player) => player.id === id);

  if (index !== -1) {
    return players.splice(index, 1)[0];
  }

  return undefined;
}

export function changePlayerTurnStatus(
  player: Player,
  status: TurnStatusOptions
) {
  players.find((toFind) => toFind.id === player.id)!.turnStatus = status;
}

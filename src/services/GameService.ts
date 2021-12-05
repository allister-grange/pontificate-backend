import {
  Player,
  TurnStatusOptions,
  Category,
  CategoryList,
  Game,
} from "../types";
import * as WORDS from "../constants/words";
import RedisClient from "../services/RedisClient";

// Join player to chat
export async function joinPlayer(
  id: string,
  userName: string,
  gameId: string
): Promise<Player> {
  const player: Player = {
    id,
    userName,
    gameId,
    points: 0,
    turnStatus: "waiting" as TurnStatusOptions,
    category: undefined,
    game: undefined,
    timeLeftInTurn: -1,
    currentWord: undefined,
    nextWord: undefined,
    skippedWord: undefined,
  };

  player.category = CategoryList[
    Math.floor(Math.random() * CategoryList.length)
  ] as Category;

  // if the player is already in the lobby (caused by refreshing in the lobby), don't
  // allow them to join
  const currentPlayers = await RedisClient.get("players");
  const playerAlreadyInGame = currentPlayers.find(
    (playerToFind: Player) => player.userName === playerToFind.userName
  );
  if (playerAlreadyInGame) {
    return playerAlreadyInGame;
  }

  currentPlayers.push(player);
  await RedisClient.set("players", currentPlayers);
  const currentGames = await RedisClient.get("games");
  const game = currentGames.find(
    (gameToFind: Game) => gameId === gameToFind.gameId
  );
  if (game) {
    game.players.push(player);
  }

  await RedisClient.set("games", currentGames);

  return player;
}

export async function getGame(gameId: string): Promise<Game | undefined> {
  const games = await RedisClient.get("games");
  return games.find((game: Game) => game.gameId === gameId);
}

export async function createGame(gameId: string, pointsToWin: number) {
  const currentGames = await RedisClient.get("games");
  currentGames.push({ players: [], gameId, pointsToWin, wordsSeenInGame: [] });
  await RedisClient.set("games", currentGames);
}

export async function getPlayerByUserName(
  userName: string
): Promise<Player | undefined> {
  const players = await RedisClient.get("players");
  return players.find((player: Player) => player.userName === userName);
}

export async function chooseNextWordForPlayer(
  userName: string,
  wordsSeenInGame: Array<string>,
  correctGuessedWord: string | undefined
) {
  const players = await RedisClient.get("players");
  const player: Player = players.find(
    (player: Player) => player.userName === userName
  );

  // if they guessed the 'skipped' word, then progress the last world
  const nextWord = getNextWord(
    wordsSeenInGame,
    correctGuessedWord,
    player.category!
  );

  if (!correctGuessedWord) {
    player.currentWord = nextWord;
    player.nextWord = getNextWord(
      [...wordsSeenInGame, correctGuessedWord!],
      correctGuessedWord,
      player.category!
    );
  } else if (correctGuessedWord === player.currentWord) {
    player.currentWord = player.nextWord;
    player.nextWord = nextWord;
  } else {
    // guessed the previously skipped word
    player.currentWord = player.nextWord;
    player.nextWord = nextWord;
    player.skippedWord = undefined;
  }

  await RedisClient.set("players", players);
}

export async function setPointsOfPlayer(userName: string, points: number) {
  if (!userName || !points) {
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
    return;
  }

  const players = await RedisClient.get("players");
  const player = players.find((player: Player) => player.userName === userName);
  if (player) {
    player.points = points;
  }
  await RedisClient.set("players", players);
}

export async function addSeenWordToGame(userName: string, word: string) {
  if (!userName || !word) {
    console.error("ERROR: Incorrect arguments passed to setPointsOfPlayer");
  }
  const players = await RedisClient.get("players");
  const player = players.find((player: Player) => player.userName === userName);
  const games = await RedisClient.get("games");
  const game: Game = games.find((game: Game) => game.gameId === player.gameId);
  if (game) {
    game.wordsSeenInGame.push(word);
  }
  await RedisClient.set("games", games);
}

export async function skipWordForPlayer(userName: string, game: Game) {
  const players = await RedisClient.get("players");
  const player: Player = players.find(
    (player: Player) => player.userName === userName
  );

  player.skippedWord = player.currentWord;
  player.currentWord = player.nextWord;
  player.nextWord = getNextWord(
    game.wordsSeenInGame,
    undefined,
    player.category!
  );

  await RedisClient.set("players", players);
}

export async function setRandomPlayerCategory(userName: string) {
  if (!userName) {
    console.error("ERROR: Incorrect arguments passed to setPlayerCategory");
    return;
  }
  const players = await RedisClient.get("players");
  const player = players.find((player: Player) => player.userName === userName);

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
  await RedisClient.set("players", players);
}

export async function setPlayerTurnStatus(
  playerUserName: string,
  turnStatus: TurnStatusOptions
) {
  if (!playerUserName || !turnStatus) {
    console.error("ERROR: Incorrect arguments passed to setPlayerTurnStatus");
    return;
  }

  const players = await RedisClient.get("players");
  const playerInGame = players.find(
    (player: Player) => player.userName === playerUserName
  );
  if (playerInGame) {
    playerInGame.turnStatus = turnStatus;
  } else {
    console.error(
      `No user found in game ${playerInGame!.gameId} with username ${
        playerInGame!.userName
      }`
    );
  }

  await RedisClient.set("players", players);
}

export async function getAllPlayersInGame(gameId: string): Promise<Player[]> {
  const players = await RedisClient.get("players");
  return players.filter((player: Player) => player.gameId === gameId);
}

export const setPlayersTimeLeftInTurn = async (
  player: Player,
  time: number
) => {
  const players = await RedisClient.get("players");
  const playerInGame = players.find(
    (playerToFind: Player) => playerToFind.userName === player.userName
  );

  // if the player is already active, don't start his timer again
  if (playerInGame && playerInGame.turnStatus != "active") {
    playerInGame.timeLeftInTurn = time;
  }
  await RedisClient.set("players", players);
};

export const takeASecondOffAPlayerTimer = async (player: Player) => {
  const players = await RedisClient.get("players");
  const playerInGame = players.find(
    (playerInGame: Player) => player.userName === playerInGame.userName
  );

  if (playerInGame && playerInGame.timeLeftInTurn > 0) {
    playerInGame.timeLeftInTurn -= 1;
  }

  await RedisClient.set("players", players);
};

// Player leaves chat
export async function kickPlayerFromGame(
  id: string
): Promise<Player | undefined> {
  const players = [...(await RedisClient.get("players"))];
  const player: Player = players.find((player) => player.id === id);
  const index = players.findIndex((player) => player.id === id);

  await RedisClient.set("players", players.splice(index, 1)[0]);

  if (index !== -1) {
    return player;
  }

  return undefined;
}

export async function changePlayerTurnStatus(
  player: Player,
  status: TurnStatusOptions
) {
  const players = await RedisClient.get("players");
  const playerToChange = players.find(
    (toFind: Player) => toFind.id === player.id
  );
  playerToChange.turnStatus = status;
  await RedisClient.set("players", players);
}

function getNextWord(
  wordsSeenInGame: Array<string>,
  correctGuessedWord: string | undefined,
  category: Category
): string | undefined {
  let words: string[] = [];

  switch (category) {
    case "action":
      words = WORDS.actionWords;
      break;
    case "nature":
      words = WORDS.natureWords;
      break;
    case "object":
      words = WORDS.objectsWords;
      break;
    case "random":
      words = WORDS.randomWords;
      break;
    case "person":
      words = WORDS.personWords;
      break;
    case "world":
      words = WORDS.worldWords;
      break;
    default:
      words = [];
  }

  const lengthOfWordArray = WORDS.personWords.length;
  let randomNum = Math.floor(Math.random() * lengthOfWordArray);
  // will screw up the session if you run out of words (impossible with the score limit)
  while (wordsSeenInGame.includes(words[randomNum])) {
    randomNum = Math.floor(Math.random() * lengthOfWordArray);
  }

  return words[randomNum];
}

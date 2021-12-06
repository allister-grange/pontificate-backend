export type Player = {
  id: string,
  gameId: string,
  userName: string,
  points: number,
  turnStatus: TurnStatusOptions,
  category: Category | undefined,
  game: Game | undefined,
  timeLeftInTurn: number,
  currentWord: string | undefined,
  skippedWords: string[],
  nextWord: string | undefined,
};

export type Game = {
  players: Array<Player>,
  gameId: string,
  pointsToWin: number,
  wordsSeenInGame: Array<string>
};

export type TurnStatusOptions = 'ready'|'active'|'waiting';

export type Category = 'person'|'object'|'nature'|'random'|'action'|'world';
export const CategoryList = ['person', 'object', 'nature', 'random', 'action', 'world'];

export const TURN_LENGTH = 50;
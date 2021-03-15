export type Player = {
  id: string,
  gameId: string,
  userName: string,
  isReady: boolean,
  points: number,
  turnStatus: TurnStatusOptions,
  category: Category,
  game: Game
}

export type Game = {
  players: Array<Player>,
  gameId: string,
  pointsToWin: number
}

export type TurnStatusOptions = 'ready'|'active'|'waiting'

export type Category = 'person'|'object'|'nature'|'random'|'action'|'world'
export const CategoryList = ['person','object','nature','random','action','world'];
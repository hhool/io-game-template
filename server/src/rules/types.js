/**
 * Rules API types (JSDoc).
 *
 * The runtime is plain Node.js (ESM). We use JSDoc so editors can provide intellisense
 * without switching the project to TypeScript yet.
 */

/**
 * @typedef {{
 *  ax:number,
 *  ay:number,
 *  boost?:boolean,
 *  [k:string]: any
 * }} PlayerInput
 */

/**
 * @typedef {{
 *  name?: string,
 *  isBot?: boolean
 * }} PlayerMeta
 */

/**
 * @typedef {{
 *  width: number,
 *  height: number,
 *  tickHz: number,
 *  broadcastHz: number,
 *  roomId: string
 * }} WorldInfo
 */

/**
 * @typedef {{
 *  id: string,
 *  createWorld: (worldInfo: WorldInfo) => any,
 *  addPlayer: (world: any, playerId: string, meta?: PlayerMeta) => void,
 *  removePlayer: (world: any, playerId: string) => void,
 *  setInput: (world: any, playerId: string, input: PlayerInput) => void,
 *  step: (world: any, dt: number) => void,
 *  getSnapshot: (world: any) => any,
 *  drainEvents?: (world: any) => any[]
 * }} Rules
 */

export {};

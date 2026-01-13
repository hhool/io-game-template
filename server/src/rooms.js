import crypto from 'node:crypto';
import { createGame } from './game.js';

function now() {
  return Date.now();
}

function makeRoomId() {
  // short, URL-friendly id
  return crypto.randomBytes(4).toString('hex');
}

export class RoomManager {
  constructor({ tickHz, broadcastHz, world, emptyRoomTtlMs = 60_000, sessionTtlMs = 5 * 60_000 }) {
    this.tickHz = tickHz;
    this.broadcastHz = broadcastHz;
    this.world = world;

    this.emptyRoomTtlMs = emptyRoomTtlMs;
    this.sessionTtlMs = sessionTtlMs;

    /** @type {Map<string, {id:string, game:any, players:Set<string>, spectators:Set<string>, updatedAt:number, leaderboard:any[]}>} */
    this.rooms = new Map();

    /** token -> { token, playerId, nick, roomId, mode:'play'|'spectate', lastSeen, connectedSocketId|null } */
    this.sessions = new Map();

    /** playerId -> token */
    this.playerToken = new Map();
  }

  getOrCreateSession(token) {
    if (token && this.sessions.has(token)) {
      const s = this.sessions.get(token);
      s.lastSeen = now();
      return s;
    }

    const newToken = token || crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const session = {
      token: newToken,
      playerId,
      nick: '',
      roomId: null,
      mode: 'play',
      lastSeen: now(),
      connectedSocketId: null
    };
    this.sessions.set(newToken, session);
    this.playerToken.set(playerId, newToken);
    return session;
  }

  setNick(session, nick) {
    if (!session) return;
    if (typeof nick !== 'string') return;
    session.nick = nick.trim().slice(0, 16);
    session.lastSeen = now();
  }

  getSessionByPlayerId(playerId) {
    const token = this.playerToken.get(playerId);
    if (!token) return null;
    return this.sessions.get(token) || null;
  }

  attachSocketToSession(session, socketId) {
    session.connectedSocketId = socketId;
    session.lastSeen = now();
  }

  detachSocketFromSession(session) {
    if (!session) return;
    session.connectedSocketId = null;
    session.lastSeen = now();
  }

  cleanupExpiredSessions() {
    const t = now();
    for (const [token, s] of this.sessions) {
      if (s.connectedSocketId) continue;
      if (t - s.lastSeen > this.sessionTtlMs) {
        // remove player from room if still present
        if (s.roomId) {
          const room = this.rooms.get(s.roomId);
          if (room) {
            room.players.delete(s.playerId);
            room.spectators.delete(s.playerId);
            room.game.removePlayer?.(s.playerId);
            room.updatedAt = now();
          }
        }
        this.sessions.delete(token);
        this.playerToken.delete(s.playerId);
      }
    }
  }

  ensureRoom(roomId) {
    if (roomId && this.rooms.has(roomId)) return this.rooms.get(roomId);

    const id = roomId || makeRoomId();
    const game = createGame({ tickHz: this.tickHz, broadcastHz: this.broadcastHz, world: this.world });

    const room = {
      id,
      game,
      players: new Set(),
      bots: new Set(),
      spectators: new Set(),
      updatedAt: now(),
      leaderboard: [],
      botConfig: { enabled: false, count: 0 }
    };

    // start per-room loops
    game.start(() => {
      // no-op here; broadcast is driven by server which calls room.game.getSnapshot()
      // but keep timers running.
    });

    this.rooms.set(id, room);
    return room;
  }

  setRoomBots(roomId, { enabled, count } = {}) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.botConfig.enabled = Boolean(enabled);
    const n = Number.isFinite(count) ? Math.max(0, Math.min(30, Math.floor(count))) : room.botConfig.count;
    room.botConfig.count = n;
    room.updatedAt = now();
    return { enabled: room.botConfig.enabled, count: room.botConfig.count };
  }

  ensureBots(room) {
    if (!room) return;

    // Clean up dead bots from tracking set
    for (const id of Array.from(room.bots)) {
      if (!room.game.hasPlayer?.(id)) room.bots.delete(id);
    }

    // If no human players, keep room clean (bots shouldn't keep it alive)
    if (room.players.size === 0) {
      if (room.bots.size) {
        for (const id of Array.from(room.bots)) {
          room.game.removePlayer?.(id);
        }
        room.bots.clear();
      }
      return;
    }

    if (!room.botConfig?.enabled || room.botConfig.count <= 0) {
      if (room.bots.size) {
        for (const id of Array.from(room.bots)) {
          room.game.removePlayer?.(id);
        }
        room.bots.clear();
        room.updatedAt = now();
      }
      return;
    }

    // Add/remove to target count
    while (room.bots.size < room.botConfig.count) {
      const idx = room.bots.size + 1;
      const botId = `bot_${room.id}_${idx}_${crypto.randomBytes(2).toString('hex')}`;
      const name = `BOT${idx}`;
      room.game.addPlayer(botId, { name, isBot: true });
      room.bots.add(botId);
      room.updatedAt = now();
    }

    while (room.bots.size > room.botConfig.count) {
      const id = room.bots.values().next().value;
      if (!id) break;
      room.game.removePlayer?.(id);
      room.bots.delete(id);
      room.updatedAt = now();
    }
  }

  joinRoomAsPlayer(session, roomId) {
    const room = this.ensureRoom(roomId);

    // leave old room
    this.leaveCurrentRoom(session);

    session.roomId = room.id;
    session.mode = 'play';
    room.players.add(session.playerId);
    room.updatedAt = now();

    // create player if not exist
    room.game.addPlayer(session.playerId, { name: session.nick });

    return room;
  }

  joinRoomAsSpectator(session, roomId) {
    const room = this.ensureRoom(roomId);

    this.leaveCurrentRoom(session);

    session.roomId = room.id;
    session.mode = 'spectate';
    room.spectators.add(session.playerId);
    room.updatedAt = now();

    return room;
  }

  leaveCurrentRoom(session) {
    if (!session?.roomId) return;
    const room = this.rooms.get(session.roomId);
    if (!room) {
      session.roomId = null;
      return;
    }

    // remove membership
    room.players.delete(session.playerId);
    room.spectators.delete(session.playerId);

    // if leaving as player, keep entity until TTL (disconnect) or remove immediately?
    // Here: remove immediately when explicitly leaving.
    room.game.removePlayer?.(session.playerId);

    room.updatedAt = now();
    session.roomId = null;
  }

  setInput(session, input) {
    if (!session?.roomId) return;
    if (session.mode !== 'play') return;
    const room = this.rooms.get(session.roomId);
    if (!room) return;
    room.game.setPlayerInput(session.playerId, input);
  }

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return {
      id: room.id,
      world: room.game.getWorldInfo(),
      players: room.players.size,
      spectators: room.spectators.size
    };
  }

  listRooms({ limit = 20 } = {}) {
    return Array.from(this.rooms.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((r) => this.getRoomInfo(r.id));
  }

  computeLeaderboard(room) {
    const snap = room.game.getSnapshot();
    const top = [...snap.players]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name || '', score: p.score, color: p.color, r: p.r }));
    room.leaderboard = top;
    return top;
  }

  getRoomSnapshot(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.game.getSnapshot();
  }

  cleanupEmptyRooms() {
    const t = now();
    for (const [id, room] of this.rooms) {
      if (room.players.size > 0 || room.spectators.size > 0) continue;
      if (t - room.updatedAt > this.emptyRoomTtlMs) {
        // ensure bots are removed before stopping/deleting
        if (room.bots?.size) {
          for (const bid of Array.from(room.bots)) {
            room.game.removePlayer?.(bid);
          }
          room.bots.clear();
        }
        room.game.stop?.();
        this.rooms.delete(id);
      }
    }
  }

  tickMaintenance() {
    this.cleanupExpiredSessions();
    this.cleanupEmptyRooms();
  }

  // matchmaking: simplest queue-less quick match => join a not-full room else create
  quickMatch(session) {
    // find an active room with < N players
    const MAX_PLAYERS = 16;
    let chosen = null;
    for (const room of this.rooms.values()) {
      if (room.players.size > 0 && room.players.size < MAX_PLAYERS) {
        chosen = room;
        break;
      }
    }
    return this.joinRoomAsPlayer(session, chosen?.id);
  }
}

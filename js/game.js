// Game state and actions. No screen code here, so it can be tested on its own.
// Help stock is looked after by the caller; these functions only change the board.

import { generateLevel, reshuffle, mulberry32, TRAY_SIZE } from './generator.js';
import { occupancy, isFree, sameGroup } from './rules.js';
import { groupOf } from './tiles.js';

export { TRAY_SIZE };

export function newGame(level) {
  const g = generateLevel(level);
  return {
    level,
    layout: g.layout,
    maxOpen: g.maxOpen,
    tiles: g.tiles.map(t => ({ ...t, gone: false })), // gone = cleared from the game
    tray: [], // tile ids, in the order they arrived
    undo: [], // snapshots for reverse moves
    status: 'playing', // 'playing' | 'trayFull' | 'won'
    used: { hint: 0, shuffle: 0, undo: 0, hammer: 0, carryOn: 0 },
    elapsedMs: 0,
    moves: 0,
    shuffles: 0,
  };
}

const byId = (s, id) => s.tiles[id];

/** Tiles still on the board (not in the tray, not cleared). */
export function boardTiles(s) {
  const inTray = new Set(s.tray);
  return s.tiles.filter(t => !t.gone && !inTray.has(t.id));
}

export function freeIds(s) {
  const board = boardTiles(s);
  const occ = occupancy(board);
  return new Set(board.filter(t => isFree(t, occ)).map(t => t.id));
}

function snapshot(s) {
  return { tray: s.tray.slice(), gone: s.tiles.filter(t => t.gone).map(t => t.id) };
}

/**
 * Tap a tile: if it is free it goes into the tray, and clears with a matching tray tile.
 * Returns null if nothing happened, otherwise { matched: [idA, idB] | null }.
 */
export function tapTile(s, id) {
  if (s.status !== 'playing') return null;
  if (!freeIds(s).has(id)) return null;
  s.undo.push(snapshot(s));
  if (s.undo.length > 200) s.undo.shift();
  s.moves++;
  const t = byId(s, id);
  const partnerId = s.tray.find(o => sameGroup(byId(s, o).face, t.face));
  let matched = null;
  if (partnerId !== undefined) {
    s.tray = s.tray.filter(o => o !== partnerId);
    t.gone = true;
    byId(s, partnerId).gone = true;
    matched = [partnerId, id];
  } else {
    s.tray.push(id);
  }
  updateStatus(s);
  return { matched };
}

function updateStatus(s) {
  if (s.tiles.every(t => t.gone)) s.status = 'won';
  else if (s.tray.length >= TRAY_SIZE) s.status = 'trayFull';
  else s.status = 'playing';
}

export function canUndo(s) {
  return s.status === 'playing' && s.undo.length > 0;
}

/** Reverse the last tap. */
export function undoMove(s) {
  if (!canUndo(s)) return false;
  const snap = s.undo.pop();
  const gone = new Set(snap.gone);
  for (const t of s.tiles) t.gone = gone.has(t.id);
  s.tray = snap.tray;
  s.used.undo++;
  updateStatus(s);
  return true;
}

/**
 * Find a helpful move: a free tile matching one in the tray, or two free matching tiles.
 * Returns an array of tile ids to highlight (empty if there is none).
 */
export function findHint(s) {
  if (s.status !== 'playing') return [];
  const free = [...freeIds(s)].map(id => byId(s, id));
  for (const trayId of s.tray) {
    const m = free.find(t => sameGroup(t.face, byId(s, trayId).face));
    if (m) return [m.id, trayId];
  }
  // Only suggest a fresh pair if the tray has room for both.
  if (s.tray.length <= TRAY_SIZE - 2) {
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (sameGroup(free[i].face, free[j].face)) return [free[i].id, free[j].id];
      }
    }
  }
  return [];
}

/** Re-deal the faces of the tiles on the board so the game can still be finished. */
export function shuffleBoard(s) {
  if (s.status !== 'playing') return false;
  s.shuffles++;
  const rng = mulberry32((s.level * 7919 + s.shuffles * 104729 + s.moves) >>> 0);
  const board = boardTiles(s);
  const { faces } = reshuffle(board, s.tray.map(id => byId(s, id).face), s.maxOpen, rng);
  for (const t of board) t.face = faces.get(t) ?? t.face;
  s.undo = [];
  s.used.shuffle++;
  return true;
}

/**
 * Smash any tile on the board (even a covered one) together with one matching tile.
 * A matching tile in the tray is used first, otherwise the most exposed one on the board.
 * Returns the ids smashed, or null.
 */
export function hammer(s, id) {
  if (s.status !== 'playing') return null;
  const board = boardTiles(s);
  const t = board.find(b => b.id === id);
  if (!t) return null;
  let partner = s.tray.map(i => byId(s, i)).find(o => sameGroup(o.face, t.face));
  if (!partner) {
    const occ = occupancy(board);
    const others = board.filter(o => o.id !== id && groupOf(o.face) === groupOf(t.face));
    others.sort((a, b) => (isFree(b, occ) - isFree(a, occ)) || (b.z - a.z));
    partner = others[0];
  }
  if (!partner) return null;
  t.gone = true;
  partner.gone = true;
  s.tray = s.tray.filter(i => i !== partner.id);
  s.undo = [];
  s.used.hammer++;
  updateStatus(s);
  return [id, partner.id];
}

/** When the tray is full: put the tray tiles back on the board and carry on. */
export function carryOn(s) {
  if (s.status !== 'trayFull') return false;
  s.tray = [];
  s.undo = [];
  s.used.carryOn++;
  updateStatus(s);
  return true;
}

/** How many reverse moves Carry on costs, given how many you hold. */
export function carryOnCost(held) {
  return Math.min(4, Math.max(0, held));
}

// Endless level generator. Every board it makes can be cleared.
//
// Method: on the empty-faced layout, repeatedly remove a random free tile until none are left.
// That gives an order in which every tile is free when its turn comes (there is always at least
// one free tile, so this never gets stuck). Faces are then handed out along that order so that
// following it never leaves more than `maxOpen` unmatched tiles in the 4-slot tray.

import { GROUPS, groupOf } from './tiles.js';
import { occupancy, isFree } from './rules.js';
import { buildLayout } from './layouts.js';

export const TRAY_SIZE = 4;

/** Small, fast, seedable random number generator. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedForLevel(level) {
  let h = 2166136261 ^ level;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** How hard a level is. */
export function difficulty(level, rng) {
  const target = level <= 17 ? 36 + (level - 1) * 4 : 80 + Math.floor(rng() * 25) * 2;
  const maxOpen = level <= 3 ? 1 : level <= 15 ? 2 : 3;
  const kinds = Math.min(GROUPS.length, 6 + level);
  return { target, maxOpen, kinds };
}

/** A random order in which the given tiles can all be removed, one free tile at a time. */
export function removalOrder(tiles, rng) {
  const left = tiles.slice();
  const order = [];
  while (left.length) {
    const occ = occupancy(left);
    const free = left.filter(t => isFree(t, occ));
    const pick = free[Math.floor(rng() * free.length)];
    order.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return order;
}

function shuffleInPlace(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pairs of face ids for a new board, using `kinds` different groups. */
export function makePairs(nPairs, kinds, rng) {
  kinds = Math.min(GROUPS.length, Math.max(kinds, Math.ceil(nPairs / 2)), nPairs);
  const groups = shuffleInPlace(GROUPS.slice(), rng).slice(0, kinds);
  const counts = groups.map(() => 1);
  for (let extra = nPairs - kinds, i = 0; extra > 0; extra--, i++) counts[i % kinds]++;
  const pairs = [];
  groups.forEach((g, gi) => {
    for (let p = 0; p < counts[gi]; p++) {
      if (g.faces.length === 1) pairs.push([g.faces[0], g.faces[0]]);
      else {
        const two = shuffleInPlace(g.faces.slice(), rng).slice(0, 2);
        pairs.push(two);
      }
    }
  });
  return shuffleInPlace(pairs, rng);
}

/**
 * Give each tile in `order` a face.
 * `singles` are faces needed first, one each, to match tiles already sitting in the tray.
 * `pairs` are matching face pairs for the rest.
 */
export function assignFaces(order, pairs, singles, maxOpen, rng) {
  const faces = new Map();
  let i = 0;
  for (const f of singles) faces.set(order[i++], f);
  const pool = pairs.slice();
  const open = []; // faces still waiting for their partner
  for (; i < order.length; i++) {
    const remaining = order.length - i;
    const mustClose = open.length > 0 && (open.length >= maxOpen || open.length >= remaining || !pool.length);
    const mustOpen = open.length === 0;
    if (mustOpen && !pool.length) break; // nothing left to give out (only if the input was uneven)
    if (mustOpen || (!mustClose && rng() < 0.5)) {
      const [a, b] = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      faces.set(order[i], a);
      open.push(b);
    } else {
      faces.set(order[i], open.splice(Math.floor(rng() * open.length), 1)[0]);
    }
  }
  return faces;
}

/** Split a list of faces into matching pairs (every group must have an even count). */
export function pairUp(faceList, rng) {
  const byGroup = new Map();
  for (const f of shuffleInPlace(faceList.slice(), rng)) {
    const g = groupOf(f);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(f);
  }
  const pairs = [];
  for (const fs of byGroup.values()) for (let i = 0; i + 1 < fs.length; i += 2) pairs.push([fs[i], fs[i + 1]]);
  return pairs;
}

/** Build level `level`. The same level number always gives the same board. */
export function generateLevel(level) {
  const rng = mulberry32(seedForLevel(level));
  const d = difficulty(level, rng);
  const { name, positions } = buildLayout(d.target, rng);
  const tiles = positions.map((p, id) => ({ id, ...p }));
  const order = removalOrder(tiles, rng);
  const faces = assignFaces(order, makePairs(tiles.length / 2, d.kinds, rng), [], d.maxOpen, rng);
  for (const t of tiles) t.face = faces.get(t);
  return { level, layout: name, maxOpen: d.maxOpen, tiles, solution: order.map(t => t.id) };
}

/**
 * Re-deal the faces of the tiles still on the board so the game can still be finished.
 * `boardTiles` are the tiles on the board; `trayFaces` the faces currently in the tray.
 * Returns { faces: Map tile -> new face, order: tiles in a winning order }.
 */
export function reshuffle(boardTiles, trayFaces, maxOpen, rng) {
  const remaining = boardTiles.map(t => t.face);
  const singles = [];
  for (const tf of trayFaces) {
    const idx = remaining.findIndex(f => groupOf(f) === groupOf(tf));
    if (idx >= 0) singles.push(remaining.splice(idx, 1)[0]);
  }
  const order = removalOrder(boardTiles, rng);
  const faces = assignFaces(order, pairUp(remaining, rng), singles, Math.min(maxOpen, TRAY_SIZE - 1), rng);
  return { faces, order };
}

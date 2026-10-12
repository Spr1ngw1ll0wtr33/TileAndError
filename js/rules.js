// Board rules. Positions use half-tile units: a tile at (x, y) covers x..x+2, y..y+2.

import { groupOf } from './tiles.js';

const key = (x, y, z) => `${x},${y},${z}`;

/** Build a lookup of occupied positions from a list of tiles (or positions). */
export function occupancy(tiles) {
  const m = new Map();
  for (const t of tiles) m.set(key(t.x, t.y, t.z), t);
  return m;
}

function anyAt(occ, x, y, z, dxs, dys) {
  for (const dx of dxs) for (const dy of dys) if (occ.has(key(x + dx, y + dy, z))) return true;
  return false;
}

const NEAR = [-1, 0, 1];

/** Is anything lying on top of this tile? */
export function isCovered(t, occ) {
  return anyAt(occ, t.x, t.y, t.z + 1, NEAR, NEAR);
}

/** A tile is free when nothing is on top and its left or right side is clear. */
export function isFree(t, occ) {
  if (isCovered(t, occ)) return false;
  const left = anyAt(occ, t.x - 2, t.y, t.z, [0], NEAR);
  const right = anyAt(occ, t.x + 2, t.y, t.z, [0], NEAR);
  return !left || !right;
}

export function sameGroup(a, b) {
  return groupOf(a) === groupOf(b);
}

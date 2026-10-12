// Board shapes, built to suit an upright phone screen (at most 7 tiles across, 9 down).
// Positions are in half-tile units: {x, y, z}.

const MAX_W = 7;
const MAX_H = 9;

const k2 = (x, y) => `${x},${y}`;

/** Rows of given widths, centred on the widest row (odd differences give a half-tile offset). */
function rows(widths) {
  const wmax = Math.max(...widths);
  const cells = [];
  widths.forEach((w, r) => {
    const start = wmax - w; // half units
    for (let i = 0; i < w; i++) cells.push([start + i * 2, r * 2]);
  });
  return cells;
}

const TEMPLATES = {
  rectangle: (w, h) => rows(Array(h).fill(w)),
  diamond: (w, h) => {
    const mid = (h - 1) / 2;
    return rows(Array.from({ length: h }, (_, r) => Math.max(1, w - Math.round(Math.abs(r - mid)) * 2)));
  },
  hourglass: (w, h) => {
    const mid = (h - 1) / 2;
    return rows(Array.from({ length: h }, (_, r) => Math.min(w, Math.max(2, w - Math.max(0, Math.floor(mid) - Math.round(Math.abs(r - mid))) * 2))));
  },
  arch: (w, h) => {
    // A rounded top with an opening at the bottom centre.
    const widths = Array.from({ length: h }, (_, r) => (r === 0 ? Math.max(1, w - 4) : r === 1 ? Math.max(1, w - 2) : w));
    const cells = rows(widths);
    const wmax = Math.max(...widths);
    const gap = w >= 5 ? (w % 2 ? 1 : 2) : 0;
    const openRows = Math.max(1, Math.floor(h / 3));
    const gapStart = wmax - gap; // half units, centred
    return cells.filter(([x, y]) => !(gap && y >= (h - openRows) * 2 && x >= gapStart && x < gapStart + gap * 2));
  },
  cross: (w, h) => {
    const cw = w >= 5 ? 3 : 1, ch = h >= 5 ? 3 : 1;
    const cells = [];
    const top = Math.floor((h - ch) / 2), left = Math.floor((w - cw) / 2);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if ((c >= left && c < left + cw) || (r >= top && r < top + ch)) cells.push([c * 2, r * 2]);
    }
    return cells;
  },
  columns: (w, h) => {
    const cells = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (c % 2 === 0 || r === 0 || r === h - 1) cells.push([c * 2, r * 2]);
    }
    return cells;
  },
  frame: (w, h) => {
    const cells = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const edge = r === 0 || r === h - 1 || c === 0 || c === w - 1;
      const centre = r >= 2 && r <= h - 3 && c >= 2 && c <= w - 3;
      if (edge || centre) cells.push([c * 2, r * 2]);
    }
    return cells;
  },
  rounded: (w, h) => rows(Array.from({ length: h }, (_, r) => (r === 0 || r === h - 1 ? Math.max(1, w - 2) : w))),
  stepped: (w, h) => rows(Array.from({ length: h }, (_, r) => {
    const fromEdge = Math.min(r, h - 1 - r);
    return fromEdge === 0 ? Math.max(1, w - 4) : fromEdge === 1 ? Math.max(1, w - 2) : w;
  })),
  towers: (w, h) => {
    // Two blocks joined along the bottom, with a gap down the middle at the top.
    const cells = [];
    const mid = Math.floor(w / 2);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (!(c === mid && w % 2 === 1 && r < h - 2)) cells.push([c * 2, r * 2]);
    }
    return cells;
  },
  scatter: (w, h, rng) => {
    // Random but mirrored left to right, so it still looks deliberate.
    const cells = [];
    const half = Math.ceil(w / 2);
    for (let r = 0; r < h; r++) for (let c = 0; c < half; c++) {
      if (rng() < 0.72 || c === half - 1) {
        cells.push([c * 2, r * 2]);
        const m = w - 1 - c;
        if (m !== c) cells.push([m * 2, r * 2]);
      }
    }
    return cells;
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

/** Stack further layers on top of the base. */
function stack(base, layers, method) {
  const out = base.map(([x, y]) => ({ x, y, z: 0 }));
  let cur = new Set(base.map(([x, y]) => k2(x, y)));
  let curCells = base;
  for (let z = 1; z < layers; z++) {
    const next = [];
    for (const [x, y] of curCells) {
      if (method === 'inset') {
        if (cur.has(k2(x - 2, y)) && cur.has(k2(x + 2, y)) && cur.has(k2(x, y - 2)) && cur.has(k2(x, y + 2))) next.push([x, y]);
      } else if (cur.has(k2(x + 2, y)) && cur.has(k2(x, y + 2)) && cur.has(k2(x + 2, y + 2))) {
        next.push([x + 1, y + 1]);
      }
    }
    if (!next.length) break;
    for (const [x, y] of next) out.push({ x, y, z });
    cur = new Set(next.map(([x, y]) => k2(x, y)));
    curCells = next;
  }
  return out;
}

function coveredBy(p, all) {
  return all.some(q => q.z === p.z + 1 && Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2);
}

/** Remove uncovered tiles from the top down (in mirrored pairs where possible) until the count is right. */
function trim(positions, target, rng) {
  let ps = positions.slice();
  const minX = Math.min(...ps.map(p => p.x)), maxX = Math.max(...ps.map(p => p.x));
  while (ps.length > target) {
    const topZ = Math.max(...ps.filter(p => !coveredBy(p, ps)).map(p => p.z));
    const cands = ps.filter(p => p.z === topZ && !coveredBy(p, ps));
    const p = cands[Math.floor(rng() * cands.length)];
    const mirror = cands.find(q => q !== p && q.y === p.y && q.x === minX + maxX - p.x);
    ps = ps.filter(q => q !== p && (ps.length - 1 <= target || q !== mirror));
  }
  return ps;
}

/** A board layout with exactly `target` positions (target must be even), or as close as possible. */
export function buildLayout(target, rng) {
  // Try shapes in a random order; within a shape, pick at random among the sizes that are
  // big enough without being much too big (the excess is trimmed off the top).
  const names = TEMPLATE_NAMES.slice();
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  let chosen = null, biggest = null;
  for (const name of names) {
    const fits = [];
    for (let w = 3; w <= MAX_W; w++) for (let h = 3; h <= MAX_H; h++) {
      const base = TEMPLATES[name](w, h, rng);
      for (let layers = 1; layers <= 5; layers++) for (const method of ['inset', 'centred']) {
        const ps = stack(base, layers, method);
        if (!biggest || ps.length > biggest.ps.length) biggest = { name, ps };
        if (ps.length >= target && ps.length <= target * 1.2 + 2) fits.push(ps);
      }
    }
    if (fits.length) {
      chosen = { name, ps: fits[Math.floor(rng() * fits.length)] };
      break;
    }
  }
  if (!chosen) chosen = biggest;
  let ps = chosen.ps;
  const goal = Math.min(target, ps.length - (ps.length % 2));
  ps = trim(ps, goal, rng);
  // Normalise so the top-left corner is at 0,0.
  const mx = Math.min(...ps.map(p => p.x)), my = Math.min(...ps.map(p => p.y));
  return { name: chosen.name, positions: ps.map(p => ({ x: p.x - mx, y: p.y - my, z: p.z })) };
}

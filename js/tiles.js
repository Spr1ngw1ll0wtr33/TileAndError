// Traditional Mahjong tile set and the SVG drawing of each face.
// Colours are taken only from the Layered Paper palette.

const C = {
  ink: '#2E3322',
  forest: '#3E4A30',
  olive: '#4D593C',
  khaki: '#998C5A',
  sand: '#C4AC84',
  linen: '#EFE7D6',
  crimson: '#6E2A30',
};

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WINDS = { E: '東', S: '南', W: '西', N: '北' };
const FLOWER_CHARS = ['梅', '蘭', '菊', '竹'];
const SEASON_CHARS = ['春', '夏', '秋', '冬'];

// Every face: id, the group it matches within, and a plain-English name.
export const FACES = [];
for (const [suit, name] of [['d', 'Circles'], ['b', 'Bamboo'], ['c', 'Characters']]) {
  for (let n = 1; n <= 9; n++) FACES.push({ id: `${suit}${n}`, group: `${suit}${n}`, name: `${n} of ${name}` });
}
for (const [k, n] of [['E', 'East'], ['S', 'South'], ['W', 'West'], ['N', 'North']]) {
  FACES.push({ id: `w${k}`, group: `w${k}`, name: `${n} Wind` });
}
FACES.push({ id: 'drR', group: 'drR', name: 'Red Dragon' });
FACES.push({ id: 'drG', group: 'drG', name: 'Green Dragon' });
FACES.push({ id: 'drW', group: 'drW', name: 'White Dragon' });
['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'].forEach((n, i) => FACES.push({ id: `f${i + 1}`, group: 'F', name: `${n} (flower)` }));
['Spring', 'Summer', 'Autumn', 'Winter'].forEach((n, i) => FACES.push({ id: `s${i + 1}`, group: 'S', name: `${n} (season)` }));

const BY_ID = Object.fromEntries(FACES.map(f => [f.id, f]));

/** The matching group of a face id. Flowers match any flower; seasons any season. */
export function groupOf(faceId) {
  return BY_ID[faceId].group;
}

export function faceName(faceId) {
  return BY_ID[faceId].name;
}

/** All groups, each with the faces that belong to it. */
export const GROUPS = (() => {
  const m = new Map();
  for (const f of FACES) {
    if (!m.has(f.group)) m.set(f.group, []);
    m.get(f.group).push(f.id);
  }
  return [...m.entries()].map(([group, faces]) => ({ group, faces }));
})();

// ---------- drawing ----------
// Faces are drawn on a 60 × 80 canvas.

function dot(x, y, r, colour) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${colour}"/>` +
    `<circle cx="${x}" cy="${y}" r="${(r * 0.42).toFixed(1)}" fill="${C.linen}"/>`;
}

const DOT_LAYOUTS = {
  2: [[30, 24, 'forest'], [30, 56, 'ink']],
  3: [[16, 18, 'ink'], [30, 40, 'crimson'], [44, 62, 'forest']],
  4: [[18, 24, 'ink'], [42, 24, 'forest'], [18, 56, 'forest'], [42, 56, 'ink']],
  5: [[17, 20, 'forest'], [43, 20, 'ink'], [30, 40, 'crimson'], [17, 60, 'ink'], [43, 60, 'forest']],
  6: [[18, 16, 'forest'], [42, 16, 'forest'], [18, 42, 'crimson'], [42, 42, 'crimson'], [18, 64, 'crimson'], [42, 64, 'crimson']],
  7: [[14, 12, 'forest'], [30, 20, 'forest'], [46, 28, 'forest'], [18, 48, 'crimson'], [42, 48, 'crimson'], [18, 67, 'crimson'], [42, 67, 'crimson']],
  8: [[18, 12, 'ink'], [42, 12, 'ink'], [18, 31, 'ink'], [42, 31, 'ink'], [18, 50, 'ink'], [42, 50, 'ink'], [18, 69, 'ink'], [42, 69, 'ink']],
  9: [[14, 17, 'ink'], [30, 17, 'ink'], [46, 17, 'ink'], [14, 40, 'crimson'], [30, 40, 'crimson'], [46, 40, 'crimson'], [14, 63, 'forest'], [30, 63, 'forest'], [46, 63, 'forest']],
};
const DOT_R = { 2: 10, 3: 8.5, 4: 9, 5: 8.5, 6: 8, 7: 7, 8: 7, 9: 7 };

function drawDots(n) {
  if (n === 1) {
    return `<circle cx="30" cy="40" r="22" fill="${C.forest}"/>` +
      `<circle cx="30" cy="40" r="17" fill="${C.linen}"/>` +
      `<circle cx="30" cy="40" r="13" fill="${C.crimson}"/>` +
      `<circle cx="30" cy="40" r="7" fill="${C.linen}"/>` +
      `<circle cx="30" cy="40" r="3.5" fill="${C.ink}"/>`;
  }
  return DOT_LAYOUTS[n].map(([x, y, c]) => dot(x, y, DOT_R[n], C[c])).join('');
}

function stick(x, y, h, colour) {
  const w = 6.5;
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3" fill="${colour}"/>` +
    `<line x1="${x - w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y}" stroke="${C.linen}" stroke-width="1.6"/>` +
    `<line x1="${x}" y1="${y - h / 2 + 3}" x2="${x}" y2="${y + h / 2 - 3}" stroke="${C.linen}" stroke-width="0.9" opacity="0.7"/>`;
}

// A simple folded almond leaf: one lit half, one shaded half (the Layered Paper motif).
function leaf(cx, cy, len, angle, dark, light) {
  const h = len / 2, w = len * 0.22;
  return `<g transform="translate(${cx} ${cy}) rotate(${angle})">` +
    `<path d="M0 ${-h} Q${w} 0 0 ${h} Z" fill="${dark}"/>` +
    `<path d="M0 ${-h} Q${-w} 0 0 ${h} Z" fill="${light}"/>` +
    `<line x1="0" y1="${-h}" x2="0" y2="${h}" stroke="${C.linen}" stroke-width="0.6" opacity="0.6"/></g>`;
}

const BAMBOO_LAYOUTS = {
  2: { h: 26, s: [[30, 22, 'forest'], [30, 58, 'ink']] },
  3: { h: 26, s: [[30, 22, 'ink'], [19, 58, 'forest'], [41, 58, 'forest']] },
  4: { h: 26, s: [[19, 22, 'ink'], [41, 22, 'forest'], [19, 58, 'forest'], [41, 58, 'ink']] },
  5: { h: 26, s: [[15, 22, 'forest'], [45, 22, 'ink'], [30, 40, 'crimson'], [15, 58, 'ink'], [45, 58, 'forest']] },
  6: { h: 26, s: [[15, 22, 'forest'], [30, 22, 'forest'], [45, 22, 'forest'], [15, 58, 'ink'], [30, 58, 'ink'], [45, 58, 'ink']] },
  7: { h: 20, s: [[30, 14, 'crimson'], [15, 40, 'forest'], [30, 40, 'ink'], [45, 40, 'forest'], [15, 64, 'forest'], [30, 64, 'ink'], [45, 64, 'forest']] },
  8: { h: 26, s: [[12, 22, 'forest'], [24, 22, 'crimson'], [36, 22, 'crimson'], [48, 22, 'forest'], [12, 58, 'forest'], [24, 58, 'crimson'], [36, 58, 'crimson'], [48, 58, 'forest']] },
  9: { h: 20, s: [[15, 16, 'forest'], [30, 16, 'crimson'], [45, 16, 'ink'], [15, 40, 'forest'], [30, 40, 'crimson'], [45, 40, 'ink'], [15, 64, 'forest'], [30, 64, 'crimson'], [45, 64, 'ink']] },
};

function drawBamboo(n) {
  if (n === 1) {
    // One tall stalk with folded leaves, in place of the traditional bird.
    return `<rect x="27" y="12" width="6" height="58" rx="3" fill="${C.forest}"/>` +
      `<line x1="27" y1="30" x2="33" y2="30" stroke="${C.linen}" stroke-width="1.6"/>` +
      `<line x1="27" y1="50" x2="33" y2="50" stroke="${C.linen}" stroke-width="1.6"/>` +
      leaf(19, 26, 20, -55, C.forest, C.olive) +
      leaf(42, 40, 20, 55, C.olive, C.khaki) +
      leaf(19, 54, 18, -60, C.crimson, C.crimson);
  }
  const L = BAMBOO_LAYOUTS[n];
  return L.s.map(([x, y, c]) => stick(x, y, L.h, C[c])).join('');
}

function cjk(ch, x, y, size, colour) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${colour}" text-anchor="middle" ` +
    `font-family="TileCJK, 'Noto Serif CJK SC', 'Noto Sans CJK SC', serif" font-weight="600">${ch}</text>`;
}

function corner(label, colour = C.ink) {
  return `<text x="5" y="13" font-size="12" fill="${colour}" font-family="Josefin Sans, sans-serif" font-weight="600">${label}</text>`;
}

function drawFlower(n) {
  let art = '';
  if (n === 1) { // plum blossom
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      art += `<circle cx="${(30 + Math.cos(a) * 8).toFixed(1)}" cy="${(34 + Math.sin(a) * 8).toFixed(1)}" r="6.5" fill="${C.crimson}"/>`;
    }
    art += `<circle cx="30" cy="34" r="4" fill="${C.khaki}"/>`;
    art += `<path d="M30 46 Q26 54 18 58" stroke="${C.forest}" stroke-width="2.5" fill="none"/>`;
  } else if (n === 2) { // orchid
    art += leaf(22, 44, 30, -25, C.forest, C.olive) + leaf(38, 44, 30, 25, C.olive, C.khaki) + leaf(30, 46, 30, 0, C.forest, C.olive);
    art += `<circle cx="30" cy="24" r="6" fill="${C.crimson}"/><circle cx="30" cy="24" r="2.2" fill="${C.linen}"/>`;
  } else if (n === 3) { // chrysanthemum
    for (let i = 0; i < 12; i++) art += leaf(30 + Math.cos(i * Math.PI / 6) * 8, 34 + Math.sin(i * Math.PI / 6) * 8, 11, i * 30 + 90, C.olive, C.khaki);
    art += `<circle cx="30" cy="34" r="5" fill="${C.crimson}"/>`;
  } else { // bamboo
    art += `<rect x="27" y="16" width="6" height="40" rx="3" fill="${C.forest}"/>` +
      `<line x1="27" y1="34" x2="33" y2="34" stroke="${C.linen}" stroke-width="1.6"/>` +
      leaf(40, 26, 18, 60, C.olive, C.khaki) + leaf(20, 40, 18, -60, C.forest, C.olive);
  }
  return art + cjk(FLOWER_CHARS[n - 1], 30, 74, 13, C.forest) + corner(n, C.crimson);
}

function drawSeason(n) {
  let art = '';
  if (n === 1) { // spring sprout
    art += `<path d="M30 54 L30 32" stroke="${C.forest}" stroke-width="3"/>` +
      leaf(23, 32, 18, -50, C.forest, C.olive) + leaf(37, 28, 18, 50, C.olive, C.khaki);
  } else if (n === 2) { // summer sun
    art += `<circle cx="30" cy="34" r="14" fill="${C.crimson}"/>`;
  } else if (n === 3) { // autumn leaves
    art += leaf(24, 34, 24, -30, C.crimson, C.crimson) + leaf(38, 38, 20, 35, C.khaki, C.sand);
  } else { // winter snowflake
    for (let i = 0; i < 3; i++) {
      art += `<line x1="30" y1="20" x2="30" y2="48" stroke="${C.ink}" stroke-width="2.4" transform="rotate(${i * 60} 30 34)"/>`;
    }
    art += `<circle cx="30" cy="34" r="3" fill="${C.ink}"/>`;
  }
  return art + cjk(SEASON_CHARS[n - 1], 30, 74, 13, C.ink) + corner(n, C.crimson);
}

function drawDragon(faceId) {
  if (faceId === 'drR') return cjk('中', 30, 55, 42, C.crimson);
  if (faceId === 'drG') return cjk('發', 30, 55, 42, C.forest);
  return `<rect x="11" y="13" width="38" height="54" rx="3" fill="none" stroke="${C.ink}" stroke-width="3"/>` +
    `<rect x="17" y="19" width="26" height="42" rx="2" fill="none" stroke="${C.ink}" stroke-width="1.2"/>`;
}

/** SVG markup (no outer tile) for a face. */
export function faceSVG(faceId, showIndex = true) {
  const t = faceId[0], rest = faceId.slice(1);
  let body = '';
  if (faceId.startsWith('dr')) {
    body = drawDragon(faceId);
  } else if (t === 'd') {
    body = drawDots(+rest) + (showIndex ? corner(rest) : '');
  } else if (t === 'b') {
    body = drawBamboo(+rest) + (showIndex ? corner(rest) : '');
  } else if (t === 'c') {
    body = cjk(NUMERALS[+rest - 1], 30, 36, 28, C.ink) + cjk('萬', 30, 70, 28, C.crimson) + (showIndex ? corner(rest) : '');
  } else if (t === 'w') {
    body = cjk(WINDS[rest], 30, 54, 38, C.ink) + (showIndex ? corner(rest) : '');
  } else if (t === 'f') {
    body = drawFlower(+rest);
  } else if (t === 's') {
    body = drawSeason(+rest);
  }
  return `<svg viewBox="0 0 60 80" aria-hidden="true">${body}</svg>`;
}

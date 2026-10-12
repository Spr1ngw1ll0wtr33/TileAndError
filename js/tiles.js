// Picture tiles. Each tile shows one main symbol: a number, a simple Chinese character,
// a traditional pattern, or a picture. A tile matches only an identical tile.
// Faces are drawn on a 60 × 72 canvas.

// Two colour schemes. "paper" uses the Layered Paper palette; "soft" is a gentle red, green and blue.
export const PALETTES = {
  paper: { R: '#6E2A30', O: '#B9653A', G: '#4D593C', B: '#2E3322', Y: '#998C5A', S: '#C4AC84', K: '#2E3322', W: '#F6F0E2', P: '#C98F86' },
  soft: { R: '#B04A3E', O: '#C98A3A', G: '#4E7A4E', B: '#3F5F8A', Y: '#C9A44C', S: '#C4AC84', K: '#2E3322', W: '#F6F0E2', P: '#D99A9A' },
};

// ---------- the faces ----------

const NUMBER_COLOURS = ['R', 'G', 'B', 'O', 'R', 'G', 'B', 'O', 'R'];
const CHARACTERS = { zhong: ['中', 'R', 'Middle'], shan: ['山', 'G', 'Mountain'], huo: ['火', 'O', 'Fire'], shui: ['水', 'B', 'Water'] };

export const THEMES = {
  nature: ['lotus', 'panda', 'cherry', 'bamboo', 'koi', 'crane', 'plum', 'pine'],
  emblems: ['dragon', 'phoenix', 'lantern', 'fan', 'pagoda', 'teapot', 'coin'],
  seaside: ['boat', 'fish', 'lighthouse', 'crab', 'shell', 'anchor'],
  garden: ['tulip', 'butterfly', 'robin', 'mushroom', 'sun', 'moon', 'umbrella', 'key'],
};

const PICTURE_NAMES = {
  lotus: 'Lotus', panda: 'Panda', cherry: 'Cherry tree', bamboo: 'Bamboo', koi: 'Koi carp', crane: 'Crane',
  plum: 'Plum blossom', pine: 'Pine tree', dragon: 'Dragon', phoenix: 'Phoenix', lantern: 'Lantern', fan: 'Fan',
  pagoda: 'Pagoda', teapot: 'Teapot', coin: 'Lucky coin', boat: 'Boat', fish: 'Fish', lighthouse: 'Lighthouse',
  crab: 'Crab', shell: 'Shell', anchor: 'Anchor', tulip: 'Tulip', butterfly: 'Butterfly', robin: 'Robin',
  mushroom: 'Mushroom', sun: 'Sun', moon: 'Moon', umbrella: 'Umbrella', key: 'Key',
};

export const FACES = [];
for (let n = 1; n <= 9; n++) FACES.push({ id: `n${n}`, kind: 'number', name: `Number ${n}` });
for (const [k, [, , name]] of Object.entries(CHARACTERS)) FACES.push({ id: `c-${k}`, kind: 'character', name: `${name} (Chinese)` });
FACES.push({ id: 'p-dots4', kind: 'pattern', name: 'Four circles' });
FACES.push({ id: 'p-dots5', kind: 'pattern', name: 'Five circles' });
FACES.push({ id: 'p-sticks3', kind: 'pattern', name: 'Three bamboo sticks' });
FACES.push({ id: 'p-sticks6', kind: 'pattern', name: 'Six bamboo sticks' });
for (const [theme, ids] of Object.entries(THEMES)) for (const id of ids) FACES.push({ id, kind: 'picture', theme, name: PICTURE_NAMES[id] });

const BY_ID = Object.fromEntries(FACES.map(f => [f.id, f]));

export function isFace(id) {
  return id in BY_ID;
}

/** Tiles match only identical tiles, so a face's group is the face itself. */
export function groupOf(faceId) {
  return faceId;
}

export function faceName(faceId) {
  return BY_ID[faceId].name;
}

export const ALWAYS = FACES.filter(f => f.kind !== 'picture').map(f => f.id);

// ---------- drawing helpers ----------

function leaf(cx, cy, len, angle, fill) {
  const h = len / 2, w = len * 0.24;
  return `<g transform="translate(${cx} ${cy}) rotate(${angle})"><path d="M0 ${-h} Q${w} 0 0 ${h} Q${-w} 0 0 ${-h}Z" fill="${fill}"/>` +
    `<line x1="0" y1="${-h * 0.8}" x2="0" y2="${h * 0.8}" stroke="#F6F0E2" stroke-width="0.8" opacity="0.6"/></g>`;
}

function blossom(cx, cy, r, petal, centre) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * Math.PI / 180;
    s += `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="${(r * 0.85).toFixed(1)}" fill="${petal}"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.55).toFixed(1)}" fill="${centre}"/>`;
}

function ring(cx, cy, r, fill, inner) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.42).toFixed(1)}" fill="${inner}"/>`;
}

function stick(x, y, h, fill, light) {
  return `<rect x="${x - 3.5}" y="${y - h / 2}" width="7" height="${h}" rx="3.5" fill="${fill}"/>` +
    `<line x1="${x - 3.5}" y1="${y}" x2="${x + 3.5}" y2="${y}" stroke="${light}" stroke-width="1.8"/>`;
}

// ---------- pictures ----------

const PICTURES = {
  lotus: c => `<ellipse cx="30" cy="56" rx="22" ry="6" fill="${c.G}"/>` +
    [-64, -32, 32, 64].map(a => `<path d="M30 52 Q24 38 30 22 Q36 38 30 52Z" fill="${c.P}" transform="rotate(${a} 30 52)"/>`).join('') +
    `<path d="M30 52 Q22 36 30 16 Q38 36 30 52Z" fill="${c.R}"/>` +
    `<circle cx="30" cy="48" r="3.5" fill="${c.Y}"/>`,

  panda: c => `<circle cx="16" cy="20" r="7" fill="${c.K}"/><circle cx="44" cy="20" r="7" fill="${c.K}"/>` +
    `<circle cx="30" cy="38" r="20" fill="${c.W}" stroke="${c.K}" stroke-width="2"/>` +
    `<ellipse cx="22" cy="36" rx="5.5" ry="7" fill="${c.K}" transform="rotate(-25 22 36)"/>` +
    `<ellipse cx="38" cy="36" rx="5.5" ry="7" fill="${c.K}" transform="rotate(25 38 36)"/>` +
    `<circle cx="22.5" cy="35" r="2" fill="${c.W}"/><circle cx="37.5" cy="35" r="2" fill="${c.W}"/>` +
    `<ellipse cx="30" cy="46" rx="4" ry="3" fill="${c.K}"/>` +
    `<path d="M26 51 Q30 54 34 51" stroke="${c.K}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,

  cherry: c => `<path d="M30 66 L30 44 M30 50 L20 38 M30 46 L41 34" stroke="${c.K}" stroke-width="4" stroke-linecap="round" fill="none"/>` +
    [[30, 24, 7], [17, 30, 6], [43, 28, 6], [22, 16, 5], [39, 15, 5], [12, 42, 4.5], [48, 40, 4.5]]
      .map(([x, y, r], i) => blossom(x, y, r * 0.55, i % 2 ? c.P : c.R, c.W)).join(''),

  bamboo: c => `<rect x="20" y="10" width="7" height="56" rx="3.5" fill="${c.G}"/><rect x="33" y="18" width="7" height="48" rx="3.5" fill="${c.G}"/>` +
    [24, 40, 54].map(y => `<line x1="20" y1="${y}" x2="27" y2="${y}" stroke="${c.W}" stroke-width="1.8"/>`).join('') +
    [32, 48].map(y => `<line x1="33" y1="${y}" x2="40" y2="${y}" stroke="${c.W}" stroke-width="1.8"/>`).join('') +
    leaf(13, 22, 16, -60, c.G) + leaf(47, 28, 16, 60, c.G) + leaf(47, 44, 14, 55, c.Y) + leaf(13, 46, 14, -55, c.Y),

  koi: c => `<path d="M8 40 Q20 22 40 30 Q48 34 50 38 Q48 42 40 46 Q20 54 8 40Z" fill="${c.O}"/>` +
    `<path d="M48 38 L58 28 L56 38 L58 48Z" fill="${c.O}"/>` +
    `<path d="M24 26 Q30 20 34 28Z" fill="${c.O}"/>` +
    `<circle cx="22" cy="38" r="4" fill="${c.W}"/><circle cx="33" cy="34" r="3.5" fill="${c.R}"/><circle cx="36" cy="43" r="3" fill="${c.W}"/>` +
    `<circle cx="13" cy="37" r="2" fill="${c.K}"/>` +
    `<path d="M10 43 Q6 48 4 46" stroke="${c.O}" stroke-width="1.5" fill="none"/>`,

  crane: c => `<path d="M14 40 Q24 30 40 36 Q50 40 54 50 Q40 48 30 50 Q18 50 14 40Z" fill="${c.W}" stroke="${c.K}" stroke-width="1.8"/>` +
    `<path d="M46 44 Q52 50 56 54 L46 52Z" fill="${c.K}"/>` +
    `<path d="M18 40 Q14 26 20 14" stroke="${c.K}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<circle cx="21" cy="13" r="4" fill="${c.W}" stroke="${c.K}" stroke-width="1.6"/><circle cx="21" cy="10" r="2.2" fill="${c.R}"/>` +
    `<path d="M24 14 L33 17 L24 16Z" fill="${c.Y}"/>` +
    `<path d="M30 50 L28 68 M36 50 L40 68" stroke="${c.K}" stroke-width="2" stroke-linecap="round"/>`,

  plum: c => `<path d="M6 64 Q20 52 28 40 Q36 26 54 14" stroke="${c.K}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<path d="M28 40 Q38 44 46 40" stroke="${c.K}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    blossom(20, 50, 5.5, c.R, c.Y) + blossom(36, 26, 5.5, c.R, c.Y) + blossom(46, 42, 4.5, c.R, c.Y) + blossom(50, 14, 3.5, c.R, c.Y),

  pine: c => `<rect x="27" y="52" width="6" height="14" fill="${c.K}"/>` +
    `<path d="M30 8 L44 28 L36 28 L50 44 L38 44 L54 58 L6 58 L22 44 L10 44 L24 28 L16 28Z" fill="${c.G}"/>` +
    `<path d="M30 8 L44 28 L36 28 L50 44 L38 44 L54 58 L30 58Z" fill="${c.K}" opacity="0.25"/>`,

  dragon: c => `<path d="M6 62 C14 40 22 66 30 48 S40 26 46 28" stroke="${c.G}" stroke-width="9" fill="none" stroke-linecap="round"/>` +
    `<path d="M6 62 C14 40 22 66 30 48 S40 26 46 28" stroke="${c.Y}" stroke-width="2" fill="none" stroke-dasharray="2 4" transform="translate(1.5 2)"/>` +
    [[11, 47, -20], [21, 52, 15], [29, 42, -25], [35, 31, -40]].map(([x, y, a]) => `<path d="M${x - 3} ${y} L${x} ${y - 7} L${x + 3} ${y}Z" fill="${c.R}" transform="rotate(${a} ${x} ${y})"/>`).join('') +
    `<path d="M44 22 Q34 14 38 6 Q42 14 50 14Z" fill="${c.R}"/>` +
    `<path d="M41 26 Q44 16 53 17 L60 21 L55 25 L60 29 L52 32 Q43 34 41 26Z" fill="${c.G}"/>` +
    `<path d="M47 17 L42 7 M51 16 L50 5" stroke="${c.Y}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="50" cy="22" r="2.6" fill="${c.W}"/><circle cx="50.6" cy="22" r="1.2" fill="${c.K}"/>` +
    `<path d="M58 30 Q60 38 54 40 M56 20 Q60 12 56 10" stroke="${c.O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    `<path d="M6 62 Q0 66 4 70 Q8 66 12 68 Q10 62 6 62Z" fill="${c.R}"/>`,

  phoenix: c => [[c.R, 'M30 40 Q16 44 12 56 Q10 64 4 66'], [c.O, 'M31 42 Q22 52 22 60 Q22 66 16 70'], [c.Y, 'M33 42 Q32 54 36 60 Q40 66 36 70']]
      .map(([col, d]) => `<path d="${d}" stroke="${col}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`).join('') +
    `<ellipse cx="5" cy="65" rx="4" ry="3" fill="${c.R}"/><ellipse cx="16" cy="69" rx="4" ry="3" fill="${c.O}"/><ellipse cx="36" cy="69" rx="3.5" ry="3" fill="${c.Y}"/>` +
    `<path d="M28 32 Q10 26 6 8 Q20 14 26 12 Q24 22 34 26Z" fill="${c.O}"/>` +
    `<path d="M30 30 Q24 14 34 8 Q34 18 40 22Z" fill="${c.Y}"/>` +
    `<ellipse cx="34" cy="36" rx="10" ry="8" fill="${c.R}" transform="rotate(-30 34 36)"/>` +
    `<path d="M40 30 Q46 24 46 16" stroke="${c.R}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="47" cy="14" r="5" fill="${c.R}"/><path d="M51 13 L58 15 L51 17Z" fill="${c.Y}"/>` +
    `<circle cx="48" cy="13" r="1.4" fill="${c.W}"/>` +
    `<path d="M45 10 Q42 2 48 2 M48 9 Q50 3 54 5" stroke="${c.O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,

  lantern: c => `<line x1="30" y1="4" x2="30" y2="12" stroke="${c.K}" stroke-width="2"/>` +
    `<rect x="22" y="11" width="16" height="5" rx="1.5" fill="${c.K}"/>` +
    `<ellipse cx="30" cy="34" rx="20" ry="19" fill="${c.R}"/>` +
    `<path d="M30 15 Q18 34 30 53 M30 15 Q42 34 30 53" stroke="${c.Y}" stroke-width="1.6" fill="none"/>` +
    `<line x1="30" y1="15" x2="30" y2="53" stroke="${c.Y}" stroke-width="1.6"/>` +
    `<rect x="22" y="52" width="16" height="5" rx="1.5" fill="${c.K}"/>` +
    `<path d="M26 57 L25 68 M30 57 L30 69 M34 57 L35 68" stroke="${c.O}" stroke-width="2" stroke-linecap="round"/>`,

  fan: c => {
    let s = '';
    for (let i = 0; i < 7; i++) {
      const a1 = (-160 + i * (140 / 7)) * Math.PI / 180, a2 = (-160 + (i + 1) * (140 / 7)) * Math.PI / 180;
      const p = (a, r) => `${(30 + Math.cos(a) * r).toFixed(1)} ${(54 + Math.sin(a) * r).toFixed(1)}`;
      s += `<path d="M${p(a1, 10)} L${p(a1, 40)} A40 40 0 0 1 ${p(a2, 40)} L${p(a2, 10)}Z" fill="${i % 2 ? c.O : c.R}"/>`;
    }
    return s + `<circle cx="30" cy="54" r="5" fill="${c.K}"/><rect x="27.5" y="54" width="5" height="14" rx="2" fill="${c.K}"/>`;
  },

  pagoda: c => `<rect x="28.5" y="4" width="3" height="8" fill="${c.Y}"/>` +
    [[12, 10, 18], [26, 7, 26], [40, 4, 34], [54, 2, 38]].map(([y, w1, w2], i) =>
      `<path d="M${30 - w2 / 2} ${y + 6} Q30 ${y - 2} ${30 + w2 / 2} ${y + 6} L${30 + w1 / 2 + 4} ${y + 4} L${30 - w1 / 2 - 4} ${y + 4}Z" fill="${c.G}"/>` +
      (i < 3 ? `<rect x="${30 - (w2 - 10) / 2}" y="${y + 6}" width="${w2 - 10}" height="8" fill="${c.R}"/>` : '')).join('') +
    `<rect x="12" y="60" width="36" height="8" fill="${c.R}"/><rect x="27" y="62" width="6" height="6" fill="${c.K}"/>`,

  teapot: c => `<ellipse cx="30" cy="44" rx="18" ry="16" fill="${c.G}"/>` +
    `<path d="M13 40 Q4 34 4 26 Q8 30 14 34" stroke="${c.G}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M46 36 Q58 36 56 46 Q54 54 46 52" stroke="${c.G}" stroke-width="4.5" fill="none"/>` +
    `<ellipse cx="30" cy="28" rx="12" ry="4" fill="${c.K}"/><circle cx="30" cy="23" r="3.5" fill="${c.R}"/>` +
    `<path d="M16 46 Q30 52 44 46" stroke="${c.Y}" stroke-width="2" fill="none"/>` +
    `<rect x="18" y="59" width="24" height="4" rx="2" fill="${c.K}"/>`,

  coin: c => `<circle cx="30" cy="36" r="24" fill="${c.Y}"/><circle cx="30" cy="36" r="19" fill="none" stroke="${c.O}" stroke-width="2.5"/>` +
    `<rect x="23" y="29" width="14" height="14" fill="${c.W}" stroke="${c.O}" stroke-width="2.5"/>` +
    `<circle cx="30" cy="18" r="2.4" fill="${c.O}"/><circle cx="30" cy="54" r="2.4" fill="${c.O}"/><circle cx="12" cy="36" r="2.4" fill="${c.O}"/><circle cx="48" cy="36" r="2.4" fill="${c.O}"/>`,

  boat: c => `<path d="M31 8 L31 50 L52 50Z" fill="${c.B}"/><path d="M28 14 L28 50 L10 50Z" fill="${c.B}" opacity="0.75"/>` +
    `<line x1="29.5" y1="6" x2="29.5" y2="54" stroke="${c.K}" stroke-width="2.4"/>` +
    `<path d="M30 6 L40 9 L30 12Z" fill="${c.R}"/>` +
    `<path d="M6 54 L54 54 L46 64 L14 64Z" fill="${c.B}"/>` +
    `<path d="M4 68 Q12 64 20 68 T36 68 T52 68" stroke="${c.B}" stroke-width="2" fill="none"/>`,

  fish: c => `<path d="M8 36 Q20 12 38 24 L52 14 L48 36 L52 58 L38 48 Q20 60 8 36Z" fill="${c.W}" stroke="${c.R}" stroke-width="2.4"/>` +
    `<path d="M20 20 L20 52 M28 18 L28 54 M36 24 L36 48" stroke="${c.R}" stroke-width="4.5"/>` +
    `<path d="M24 16 Q30 6 36 14" fill="${c.R}"/>` +
    `<circle cx="14" cy="34" r="2.6" fill="${c.K}"/>`,

  lighthouse: c => `<path d="M23 20 L37 20 L41 58 L19 58Z" fill="${c.W}" stroke="${c.B}" stroke-width="2"/>` +
    `<path d="M22 30 L38 30 L39 38 L21 38Z M20.5 46 L39.5 46 L40.5 54 L19.5 54Z" fill="${c.B}"/>` +
    `<rect x="24" y="11" width="12" height="9" fill="${c.Y}"/><path d="M22 11 L30 4 L38 11Z" fill="${c.B}"/>` +
    `<path d="M24 15 L10 11 M24 16 L10 20 M36 15 L50 11 M36 16 L50 20" stroke="${c.Y}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M4 62 Q12 58 20 62 T36 62 T52 62 L56 62 L56 68 L4 68Z" fill="${c.B}"/>`,

  crab: c => `<path d="M12 46 L4 54 M14 50 L8 60 M48 46 L56 54 M46 50 L52 60" stroke="${c.R}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M16 34 Q10 24 8 16 M44 34 Q50 24 52 16" stroke="${c.R}" stroke-width="3.5" stroke-linecap="round" fill="none"/>` +
    `<path d="M2 14 Q4 4 12 8 L8 14 L14 16 Q8 22 2 14Z" fill="${c.R}"/><path d="M58 14 Q56 4 48 8 L52 14 L46 16 Q52 22 58 14Z" fill="${c.R}"/>` +
    `<ellipse cx="30" cy="44" rx="18" ry="13" fill="${c.R}"/>` +
    `<line x1="25" y1="31" x2="24" y2="25" stroke="${c.R}" stroke-width="2"/><line x1="35" y1="31" x2="36" y2="25" stroke="${c.R}" stroke-width="2"/>` +
    `<circle cx="24" cy="24" r="3" fill="${c.W}"/><circle cx="36" cy="24" r="3" fill="${c.W}"/><circle cx="24" cy="24" r="1.4" fill="${c.K}"/><circle cx="36" cy="24" r="1.4" fill="${c.K}"/>`,

  shell: c => `<path d="M30 60 L6 30 Q8 10 30 8 Q52 10 54 30Z" fill="${c.O}"/>` +
    [-17, -10, -3.5, 3.5, 10, 17].map(dx => `<path d="M30 58 Q${30 + dx * 0.7} 34 ${30 + dx} 13" stroke="${c.W}" stroke-width="1.8" fill="none" opacity="0.8"/>`).join('') +
    `<path d="M22 58 L38 58 L34 66 L26 66Z" fill="${c.O}"/>`,

  anchor: c => `<circle cx="30" cy="12" r="6" fill="none" stroke="${c.B}" stroke-width="3.5"/>` +
    `<line x1="30" y1="18" x2="30" y2="62" stroke="${c.B}" stroke-width="5"/>` +
    `<line x1="18" y1="26" x2="42" y2="26" stroke="${c.B}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<path d="M10 44 Q12 62 30 64 Q48 62 50 44" stroke="${c.B}" stroke-width="5" fill="none"/>` +
    `<path d="M4 48 L10 40 L16 48Z M44 48 L50 40 L56 48Z" fill="${c.B}"/>`,

  tulip: c => `<path d="M30 40 L30 68" stroke="${c.G}" stroke-width="3.5"/>` +
    leaf(21, 56, 22, -35, c.G) + leaf(39, 58, 20, 35, c.G) +
    `<path d="M16 18 L23 26 L30 14 L37 26 L44 18 Q46 38 30 42 Q14 38 16 18Z" fill="${c.R}"/>`,

  butterfly: c => `<path d="M30 36 Q16 6 6 16 Q2 32 30 38Z" fill="${c.B}"/><path d="M30 36 Q44 6 54 16 Q58 32 30 38Z" fill="${c.B}"/>` +
    `<path d="M30 38 Q12 40 12 56 Q22 62 30 42Z" fill="${c.O}"/><path d="M30 38 Q48 40 48 56 Q38 62 30 42Z" fill="${c.O}"/>` +
    `<circle cx="16" cy="22" r="3" fill="${c.W}"/><circle cx="44" cy="22" r="3" fill="${c.W}"/>` +
    `<rect x="28" y="24" width="4" height="30" rx="2" fill="${c.K}"/>` +
    `<path d="M29 25 Q24 14 20 12 M31 25 Q36 14 40 12" stroke="${c.K}" stroke-width="1.6" fill="none"/>`,

  robin: c => `<path d="M48 40 L58 48 L54 50 L46 46Z" fill="${c.Y}"/>` +
    `<path d="M10 40 Q10 18 30 18 Q50 18 50 38 Q50 56 30 56 Q16 56 10 40Z" fill="${c.Y}"/>` +
    `<path d="M12 34 Q12 52 28 54 Q38 54 38 44 Q34 30 22 28 Q14 28 12 34Z" fill="${c.R}"/>` +
    `<circle cx="20" cy="26" r="2.6" fill="${c.K}"/><path d="M11 27 L2 30 L11 33Z" fill="${c.K}"/>` +
    `<path d="M34 30 Q44 28 48 36" stroke="${c.K}" stroke-width="1.6" fill="none" opacity="0.5"/>` +
    `<path d="M26 56 L24 66 M34 56 L36 66" stroke="${c.K}" stroke-width="2" stroke-linecap="round"/>`,

  mushroom: c => `<path d="M22 38 L20 64 Q30 68 40 64 L38 38Z" fill="${c.W}" stroke="${c.K}" stroke-width="1.6"/>` +
    `<path d="M4 40 Q6 10 30 8 Q54 10 56 40Z" fill="${c.R}"/>` +
    `<circle cx="18" cy="26" r="4" fill="${c.W}"/><circle cx="34" cy="18" r="3.5" fill="${c.W}"/><circle cx="44" cy="32" r="3.5" fill="${c.W}"/><circle cx="27" cy="34" r="2.6" fill="${c.W}"/>`,

  sun: c => [...Array(12)].map((_, i) => `<path d="M30 4 L33 13 L27 13Z" fill="${c.O}" transform="rotate(${i * 30} 30 36)"/>`).join('') +
    `<circle cx="30" cy="36" r="17" fill="${c.O}"/><circle cx="30" cy="36" r="12" fill="${c.Y}"/>`,

  moon: c => `<path d="M38 8 A26 26 0 1 0 50 52 A20 20 0 1 1 38 8Z" fill="${c.Y}"/>` +
    `<path d="M48 16 L50 22 L56 22 L51 26 L53 32 L48 28 L43 32 L45 26 L40 22 L46 22Z" fill="${c.B}"/>`,

  umbrella: c => `<path d="M4 36 Q6 8 30 6 Q54 8 56 36 Q50 30 43 36 Q37 30 30 36 Q23 30 17 36 Q10 30 4 36Z" fill="${c.R}"/>` +
    `<path d="M30 6 Q22 18 17 36 M30 6 Q38 18 43 36" stroke="${c.O}" stroke-width="2.2" fill="none"/>` +
    `<path d="M30 36 L30 60 Q30 66 24 66 Q20 66 20 60" stroke="${c.K}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,

  key: c => `<circle cx="20" cy="22" r="13" fill="none" stroke="${c.Y}" stroke-width="6"/>` +
    `<path d="M29 31 L52 58" stroke="${c.Y}" stroke-width="6.5" stroke-linecap="round"/>` +
    `<path d="M44 49 L52 42 M50 56 L57 50" stroke="${c.Y}" stroke-width="5.5" stroke-linecap="round"/>`,
};

// ---------- numbers, characters and patterns ----------

function drawNumber(n, c) {
  const col = c[NUMBER_COLOURS[n - 1]];
  return `<text x="30" y="55" font-size="54" text-anchor="middle" fill="${col}" stroke="${col}" stroke-width="2.2" ` +
    `font-family="'Josefin Sans', sans-serif" font-weight="700">${n}</text>`;
}

function drawCharacter(k, c) {
  const [ch, col] = CHARACTERS[k];
  return `<text x="30" y="53" font-size="44" text-anchor="middle" fill="${c[col]}" ` +
    `font-family="TileCJK, 'Noto Serif CJK SC', serif" font-weight="700">${ch}</text>`;
}

function drawPattern(k, c) {
  if (k === 'dots4') return ring(18, 22, 10, c.B, c.W) + ring(42, 22, 10, c.G, c.W) + ring(18, 50, 10, c.G, c.W) + ring(42, 50, 10, c.B, c.W);
  if (k === 'dots5') return ring(16, 18, 9, c.G, c.W) + ring(44, 18, 9, c.B, c.W) + ring(30, 36, 9, c.R, c.W) + ring(16, 54, 9, c.B, c.W) + ring(44, 54, 9, c.G, c.W);
  if (k === 'sticks3') return stick(30, 20, 26, c.G, c.W) + stick(18, 52, 26, c.G, c.W) + stick(42, 52, 26, c.G, c.W);
  return [15, 30, 45].map(x => stick(x, 20, 26, c.G, c.W)).join('') + [15, 30, 45].map(x => stick(x, 52, 26, c.R, c.W)).join('');
}

/** SVG markup (no outer tile) for a face. */
export function faceSVG(faceId, palette = 'paper') {
  const c = PALETTES[palette] || PALETTES.paper;
  let body;
  if (faceId[0] === 'n' && /^n\d$/.test(faceId)) body = drawNumber(+faceId[1], c);
  else if (faceId.startsWith('c-')) body = drawCharacter(faceId.slice(2), c);
  else if (faceId.startsWith('p-')) body = drawPattern(faceId.slice(2), c);
  else body = PICTURES[faceId](c);
  return `<svg viewBox="0 0 60 72" aria-hidden="true">${body}</svg>`;
}

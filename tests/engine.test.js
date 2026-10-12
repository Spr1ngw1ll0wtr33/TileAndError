import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel, removalOrder, mulberry32, reshuffle } from '../js/generator.js';
import { occupancy, isFree } from '../js/rules.js';
import { groupOf, FACES } from '../js/tiles.js';
import { newGame, tapTile, freeIds, undoMove, findHint, shuffleBoard, hammer, carryOn, carryOnCost, boardTiles, TRAY_SIZE } from '../js/game.js';

// Replay a list of tile ids; true if every tap was allowed and the board was cleared.
function replay(state, ids) {
  for (const id of ids) if (!tapTile(state, id)) return false;
  return state.status === 'won';
}

test('tile set: numbers, characters, patterns and themed pictures, each matching only itself', () => {
  assert.equal(FACES.filter(f => f.kind === 'number').length, 9);
  assert.equal(FACES.filter(f => f.kind === 'character').length, 4);
  assert.equal(FACES.filter(f => f.kind === 'pattern').length, 4);
  assert.ok(FACES.filter(f => f.kind === 'picture').length >= 29);
  assert.equal(new Set(FACES.map(f => groupOf(f.id))).size, FACES.length);
});

test('levels mix pictures from different themes', () => {
  const themesSeen = new Set();
  const mixes = new Set();
  for (let lv = 1; lv <= 40; lv++) {
    const pics = [...new Set(generateLevel(lv).tiles.map(t => t.face))].filter(f => FACES.find(x => x.id === f).kind === 'picture');
    assert.ok(pics.length > 0, `level ${lv} has no pictures`);
    const themes = [...new Set(pics.map(f => FACES.find(x => x.id === f).theme))].sort().join('+');
    themes.split('+').forEach(t => themesSeen.add(t));
    mixes.add(themes);
  }
  assert.equal(themesSeen.size, 4);
  assert.ok(mixes.size >= 5, `only ${mixes.size} different mixes`);
});

test('levels are repeatable, even-sized and use matching faces', () => {
  for (let lv = 1; lv <= 60; lv++) {
    const a = generateLevel(lv), b = generateLevel(lv);
    assert.deepEqual(a, b);
    assert.equal(a.tiles.length % 2, 0);
    const counts = {};
    for (const t of a.tiles) counts[groupOf(t.face)] = (counts[groupOf(t.face)] || 0) + 1;
    for (const c of Object.values(counts)) assert.equal(c % 2, 0);
    // no two tiles in the same spot
    assert.equal(new Set(a.tiles.map(t => `${t.x},${t.y},${t.z}`)).size, a.tiles.length);
  }
});

test('board sizes grow and stay within an upright screen', () => {
  assert.equal(generateLevel(1).tiles.length, 36);
  for (let lv = 1; lv <= 200; lv++) {
    const ts = generateLevel(lv).tiles;
    assert.ok(Math.max(...ts.map(t => t.x)) <= 13, `level ${lv} too wide`);
    assert.ok(Math.max(...ts.map(t => t.y)) <= 17, `level ${lv} too tall`);
    assert.ok(ts.length >= 30 && ts.length <= 144, `level ${lv} has ${ts.length}`);
  }
});

test('the planned order clears 500 levels without the tray ever filling', () => {
  for (let lv = 1; lv <= 500; lv++) {
    const s = newGame(lv);
    let maxTray = 0;
    for (const id of generateLevel(lv).solution) {
      assert.ok(tapTile(s, id), `level ${lv}: planned tap refused`);
      maxTray = Math.max(maxTray, s.tray.length);
    }
    assert.equal(s.status, 'won', `level ${lv} not cleared`);
    assert.ok(maxTray < TRAY_SIZE);
  }
});

test('free-tile rule: covered or hemmed-in tiles are not free', () => {
  const tiles = [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    { x: 1, y: 0, z: 1 },
  ];
  const occ = occupancy(tiles);
  assert.equal(isFree(tiles[0], occ), false); // covered by the top tile
  assert.equal(isFree(tiles[1], occ), false); // covered and hemmed in
  assert.equal(isFree(tiles[2], occ), true); // right side clear
  assert.equal(isFree(tiles[3], occ), true);
});

test('removal order always exists', () => {
  const rng = mulberry32(1);
  for (let lv = 1; lv <= 30; lv++) {
    const ts = generateLevel(lv).tiles;
    const order = removalOrder(ts, rng);
    const left = ts.slice();
    for (const t of order) {
      assert.ok(isFree(t, occupancy(left)));
      left.splice(left.indexOf(t), 1);
    }
  }
});

function fillTray(s) {
  // Tap free tiles of different groups until the tray is full.
  while (s.status === 'playing') {
    const inTray = new Set(s.tray.map(id => groupOf(s.tiles[id].face)));
    const pick = [...freeIds(s)].find(id => !inTray.has(groupOf(s.tiles[id].face)));
    if (pick === undefined) return false;
    tapTile(s, pick);
  }
  return s.status === 'trayFull';
}

test('tray fills at four unmatched tiles, and Carry on puts them back', () => {
  let lv = 30, s;
  do { s = newGame(lv++); } while (!fillTray(s));
  assert.equal(s.tray.length, TRAY_SIZE);
  const before = boardTiles(s).length;
  assert.equal(tapTile(s, [...freeIds(s)][0]), null); // no play while full
  assert.ok(carryOn(s));
  assert.equal(s.status, 'playing');
  assert.equal(s.tray.length, 0);
  assert.equal(boardTiles(s).length, before + 4);
  assert.equal(s.used.carryOn, 1);
});

test('Carry on costs up to four reverse moves, never below zero', () => {
  assert.equal(carryOnCost(0), 0);
  assert.equal(carryOnCost(2), 2);
  assert.equal(carryOnCost(5), 4);
});

test('matching pair in tray clears; undo reverses it', () => {
  const s = newGame(1);
  let h = findHint(s);
  tapTile(s, h[0]);
  assert.equal(s.tray.length, 1);
  h = findHint(s);
  const r = tapTile(s, h[0]);
  assert.ok(r.matched);
  assert.equal(s.tray.length, 0);
  assert.equal(s.tiles.filter(t => t.gone).length, 2);
  assert.ok(undoMove(s));
  assert.equal(s.tray.length, 1);
  assert.equal(s.tiles.filter(t => t.gone).length, 0);
});

test('shuffle keeps the same faces and the game still solvable', () => {
  for (const lv of [5, 25, 60]) {
    const s = newGame(lv);
    for (let i = 0; i < 9; i++) tapTile(s, [...freeIds(s)][0]);
    if (s.status !== 'playing') continue;
    const board = boardTiles(s);
    const before = board.map(t => t.face).sort();
    const { faces, order } = reshuffle(board, s.tray.map(id => s.tiles[id].face), 3, mulberry32(lv));
    for (const t of board) t.face = faces.get(t);
    assert.deepEqual(boardTiles(s).map(t => t.face).sort(), before);
    assert.ok(replay(s, order.map(t => t.id)), `level ${lv} not solvable after shuffle`);
  }
});

test('hammer smashes a tile and a matching partner, even a covered one', () => {
  const s = newGame(40);
  const covered = boardTiles(s).find(t => !freeIds(s).has(t.id));
  const ids = hammer(s, covered.id);
  assert.equal(ids.length, 2);
  assert.equal(groupOf(s.tiles[ids[0]].face), groupOf(s.tiles[ids[1]].face));
  assert.ok(s.tiles[ids[0]].gone && s.tiles[ids[1]].gone);
});

test('every face draws without error', async () => {
  const { faceSVG } = await import('../js/tiles.js');
  for (const palette of ['paper', 'soft']) for (const f of FACES) {
    const svg = faceSVG(f.id, palette);
    assert.ok(svg.length > 60 && !svg.includes('undefined') && !svg.includes('NaN'), `${f.id} ${palette}`);
  }
});

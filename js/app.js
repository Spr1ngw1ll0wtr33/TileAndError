// Screens, drawing and touch handling for Tile & Error.

import * as store from './store.js';
import { faceSVG, faceName, isFace } from './tiles.js';
import { sameGroup } from './rules.js';
import { newGame, tapTile, freeIds, undoMove, canUndo, findHint, shuffleBoard, hammer, carryOn, carryOnCost, TRAY_SIZE } from './game.js';
import { newProfile, recordResult, recordPlayDay, currentStreak, applyPrize, levelsToNextPrize, winRate, HELPS, HELP_NAMES } from './progress.js';

const VERSION = '1.1.6';
const $ = id => document.getElementById(id);

let profile = null;
let game = null;
let resumedAt = 0; // when the clock last started for the current game
let busy = false; // true while a tile is flying
let current = null; // the tile being animated
const queue = []; // tiles tapped while another was still moving, played in turn
let hammerArmed = false;
let tileEls = new Map();
let historyShown = 20;

// ---------- formatting (British: dd/mm/yyyy, 12-hour clock) ----------

function fmtDate(iso) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${h}:${p(d.getMinutes())} ${ampm}`;
}

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m} min ${s % 60} sec` : `${s} sec`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// ---------- saving ----------

function tick() {
  if (game && resumedAt) {
    const now = Date.now();
    game.elapsedMs += now - resumedAt;
    resumedAt = now;
  }
}

async function saveAll() {
  tick();
  await store.set('profile', profile);
  if (game && game.status !== 'won') await store.set('current', game);
  else await store.del('current');
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveAll(); resumedAt = 0; } else if (game && !$('game').hidden) resumedAt = Date.now();
});

// ---------- views ----------

function show(view) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== view;
  if (view !== 'game') { tick(); resumedAt = 0; } else resumedAt = Date.now();
  if (view === 'home') renderHome();
  if (view === 'progress') renderProgress();
  if (view === 'settings') renderSettings();
  if (view === 'game') requestAnimationFrame(layoutAll);
  document.querySelector('meta[name=theme-color]').content = view === 'game' ? '#3E4A30' : '#E9E0CC';
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) show(go.dataset.go);
});

// ---------- home ----------

function renderHome() {
  $('homeLevel').textContent = `Level ${profile.level}`;
  $('playBtn').textContent = game && game.level === profile.level && game.moves > 0 ? `Continue level ${profile.level}` : `Play level ${profile.level}`;
  const streak = currentStreak(profile);
  $('homeFoot').textContent = streak ? `${plural(streak, 'day')} in a row` : '';
  $('homeVersion').textContent = `Version ${VERSION}`;
  $('homeMotif').innerHTML = `<div class="tile">${faceSVG('dragon', profile.settings.palette)}</div>`;
}

$('playBtn').addEventListener('click', () => {
  if (!game || game.level !== profile.level) game = newGame(profile.level);
  startGameView();
});

// ---------- game drawing ----------

function startGameView() {
  hammerArmed = false;
  clearQueue();
  buildBoard();
  show('game');
  render();
  maybeShowPendingPrize();
}

function buildBoard() {
  const board = $('board');
  board.innerHTML = '';
  tileEls = new Map();
  for (const t of game.tiles) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.id = t.id;
    el.style.zIndex = String(t.z * 1000 + t.y * 20 + t.x);
    board.appendChild(el);
    tileEls.set(t.id, el);
  }
  $('gameTitle').textContent = `Level ${game.level}`;
}

function layoutBoard() {
  const wrap = $('boardWrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const cols = (Math.max(...game.tiles.map(t => t.x)) + 2) / 2;
  const rows = (Math.max(...game.tiles.map(t => t.y)) + 2) / 2;
  const maxZ = Math.max(...game.tiles.map(t => t.z));
  const depth = 0.09; // how far each layer shifts, as a share of tile width
  const pad = 10;
  const tw = Math.min(100, (W - pad) / (cols + maxZ * depth), (H - pad) / (rows * RATIO + maxZ * depth));
  const th = tw * RATIO;
  const dz = tw * depth;
  const board = $('board');
  board.style.width = `${cols * tw + maxZ * dz}px`;
  board.style.height = `${rows * th + maxZ * dz}px`;
  for (const t of game.tiles) {
    const el = tileEls.get(t.id);
    el.style.left = `${(t.x / 2) * tw + (maxZ - t.z) * dz}px`;
    el.style.top = `${(t.y / 2) * th + (maxZ - t.z) * dz}px`;
    el.style.width = `${tw - 1}px`;
    el.style.height = `${th - 1}px`;
  }
  return tw;
}
window.addEventListener('resize', () => requestAnimationFrame(layoutAll));

function render() {
  const free = freeIds(game);
  const inTray = new Set(game.tray);
  const palette = profile.settings.palette;
  $('board').classList.toggle('dim', profile.settings.dimBlocked);
  $('board').classList.toggle('armed', hammerArmed);
  for (const t of game.tiles) {
    const el = tileEls.get(t.id);
    const faceKey = `${t.face}|${palette}`;
    if (el.dataset.face !== faceKey) {
      el.innerHTML = faceSVG(t.face, palette);
      el.dataset.face = faceKey;
      el.setAttribute('aria-label', faceName(t.face));
    }
    el.classList.toggle('gone', t.gone || inTray.has(t.id));
    el.classList.toggle('blocked', !free.has(t.id));
    el.classList.remove('hint');
    el.style.visibility = '';
  }
  // Tray
  const slots = $('tray').children;
  for (let i = 0; i < TRAY_SIZE; i++) {
    const id = game.tray[i];
    slots[i].classList.toggle('filled', id !== undefined);
    slots[i].innerHTML = id !== undefined ? `<div class="tile">${faceSVG(game.tiles[id].face, palette)}</div>` : '';
  }
  // Helps
  for (const b of document.querySelectorAll('.help')) {
    const h = b.dataset.help;
    b.querySelector('.badge').textContent = profile.helps[h];
    b.classList.toggle('empty', profile.helps[h] < 1);
    b.classList.toggle('armed', h === 'hammer' && hammerArmed);
  }
}

function say(text) {
  $('message').textContent = text;
}

// ---------- playing ----------

// React the moment a finger touches a tile (pointerdown), not when it lifts (click).
// A click with no pointer behind it (e.g. from the keyboard) is still accepted.
$('board').addEventListener('pointerdown', e => { if (e.isPrimary) tileTapped(e); });
$('board').addEventListener('click', e => { if (e.detail === 0) tileTapped(e); });

function tileTapped(e) {
  const el = e.target.closest('.tile');
  if (!el) return;
  const id = Number(el.dataset.id);
  if (hammerArmed) return busy ? undefined : smash(id);
  if (busy) {
    // Never lose a tap: remember it and play it as soon as the current move finishes.
    if (game.status === 'playing' && id !== current && !queue.includes(id)) {
      queue.push(id);
      el.classList.add('queued');
    }
    return;
  }
  play(id, el);
}

// Timings for a tile moving into the tray and a pair clearing (halved if the phone asks for less motion).
const SLOW = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.5 : 1;
const BASE = { fly: 100, rest: 60, together: 75, click: 35, clear: 85, close: 75 };
let T = { ...BASE };
/** Normal pace, or double speed with no pause when more taps are waiting. */
function setPace() {
  const k = SLOW * (queue.length ? 0.5 : 1);
  T = Object.fromEntries(Object.entries(BASE).map(([n, ms]) => [n, ms * k]));
  if (queue.length) T.rest = 0;
}

/** Finish a move, then play the next queued tap, if any. */
function finishMove() {
  busy = false;
  current = null;
  afterMove();
  if (game && game.status === 'playing' && $('overlay').hidden && queue.length) {
    const next = queue.shift();
    const el = tileEls.get(next);
    el.classList.remove('queued');
    play(next, el);
  } else clearQueue();
}

function clearQueue() {
  for (const id of queue.splice(0)) { const el = tileEls.get(id); if (el) el.classList.remove('queued'); }
}

/** A copy of a tile, floating above the page at the given position, for animating. */
function flyer(el, rect) {
  const f = el.cloneNode(true);
  f.classList.add('flying');
  f.classList.remove('blocked', 'hint', 'nudge');
  Object.assign(f.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, visibility: 'visible' });
  document.body.appendChild(f);
  return f;
}

function moveTo(f, rect, ms, easing = 'cubic-bezier(.2,.7,.3,1)') {
  f.style.transition = ['left', 'top', 'width', 'height'].map(p => `${p} ${ms}ms ${easing}`).join(', ');
  Object.assign(f.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
}

async function play(id, el) {
  if (game.status !== 'playing') return clearQueue();
  if (!freeIds(game).has(id)) {
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    say('That tile is not free yet.');
    if (queue.length) { busy = true; return finishMove(); }
    return;
  }
  say('');
  recordPlayDay(profile);
  busy = true;
  current = id;
  setPace();
  const slots = $('tray').children;
  const partner = game.tray.find(o => sameGroup(game.tiles[o].face, game.tiles[id].face));
  // 1. Glide into the tray. A matching tile goes right next to its partner: any tiles after the
  //    partner first slide along one place to make room.
  let targetIndex = game.tray.length;
  if (partner !== undefined) {
    targetIndex = game.tray.indexOf(partner) + 1;
    const step = slots[1].getBoundingClientRect().left - slots[0].getBoundingClientRect().left;
    const after = game.tray.slice(targetIndex).map(o => slots[game.tray.indexOf(o)].querySelector('.tile'));
    for (const t of after) { t.style.transition = `transform ${T.close}ms ease-out`; t.style.transform = `translateX(${step}px)`; }
    if (after.length) await wait(T.close);
  }
  const target = slots[targetIndex].getBoundingClientRect();
  const tile = flyer(el, el.getBoundingClientRect());
  el.style.visibility = 'hidden';
  await nextFrame();
  moveTo(tile, target, T.fly);
  await wait(T.fly);

  if (partner === undefined) {
    tapTile(game, id);
    render();
    tile.remove();
    return finishMove();
  }

  // 2. Rest a moment side by side.
  const partnerEl = slots[game.tray.indexOf(partner)].querySelector('.tile');
  const partnerRect = partnerEl.getBoundingClientRect();
  const mate = flyer(partnerEl, partnerRect);
  partnerEl.style.visibility = 'hidden';
  setPace(); // speed up if she has tapped on while the tile was gliding in
  if (T.rest) await wait(T.rest);

  // 3. Slide together until they touch, then a small click.
  const meet = (partnerRect.left + partnerRect.width + target.left) / 2;
  const w = target.width;
  moveTo(mate, { ...partnerRect, left: meet - w }, T.together, 'ease-in-out');
  moveTo(tile, { ...target, left: meet }, T.together, 'ease-in-out');
  await wait(T.together);
  for (const f of [tile, mate]) { f.style.transition = `transform ${T.click}ms ease-out`; f.style.transform = 'scale(1.06)'; }
  await wait(T.click);

  // 4. Clear: shrink and fade together.
  for (const f of [tile, mate]) { f.style.transition = `transform ${T.clear}ms ease-in, opacity ${T.clear}ms ease-in`; f.style.transform = 'scale(.5)'; f.style.opacity = '0'; }
  await wait(T.clear);
  tile.remove();
  mate.remove();

  // 5. Close up: the tiles left in the tray slide along into the freed space.
  const before = new Map(game.tray.filter(o => o !== partner).map(o => [o, slots[game.tray.indexOf(o)].getBoundingClientRect().left]));
  tapTile(game, id);
  render();
  for (const [o, oldLeft] of before) {
    const t = slots[game.tray.indexOf(o)].querySelector('.tile');
    const dx = oldLeft - t.getBoundingClientRect().left;
    if (!dx) continue;
    t.style.transition = 'none';
    t.style.transform = `translateX(${dx}px)`;
  }
  await nextFrame();
  for (const t of $('tray').querySelectorAll('.tile')) { t.style.transition = `transform ${T.close}ms ease-out`; t.style.transform = ''; }
  await wait(T.close);
  finishMove();
}

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const RATIO = 1.2; // tile height ÷ width, as in the reference game

/** Size the board, then size the tray slots to match the tiles, and size the board again. */
function layoutAll() {
  if (!game || $('game').hidden) return;
  for (let pass = 0; pass < 3; pass++) {
    const tw = layoutBoard();
    const slotW = Math.max(40, Math.min(tw, ($('game').clientWidth - 72) / 4));
    $('game').style.setProperty('--tw', `${slotW}px`);
    $('game').style.setProperty('--th', `${slotW * RATIO}px`);
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function afterMove() {
  saveAll();
  if (game.status === 'won') return levelWon();
  if (game.status === 'trayFull') return trayFull();
  if (game.tray.length === TRAY_SIZE - 1) say('One space left in the tray.');
}

// ---------- helps ----------

document.querySelector('.helps').addEventListener('click', e => {
  const b = e.target.closest('.help');
  if (!b || busy || game.status !== 'playing') return;
  const h = b.dataset.help;
  if (h === 'hammer' && hammerArmed) { hammerArmed = false; say(''); return render(); }
  if (profile.helps[h] < 1) {
    say(`You have no ${HELP_NAMES[h].toLowerCase()}s left. Next prize in ${plural(levelsToNextPrize(profile.level - 1), 'level')}.`);
    return;
  }
  if (h === 'hint') {
    const ids = findHint(game);
    if (!ids.length) { say('No pairs are free right now. A shuffle may help.'); return; }
    profile.helps.hint--;
    game.used.hint++;
    render();
    for (const id of ids) {
      if (game.tray.includes(id)) continue;
      tileEls.get(id).classList.add('hint');
    }
    say(game.tray.includes(ids[1]) ? 'This one matches a tile in your tray.' : 'These two match.');
  } else if (h === 'shuffle') {
    shuffleBoard(game);
    profile.helps.shuffle--;
    render();
    say('Shuffled.');
  } else if (h === 'undo') {
    if (!canUndo(game)) { say('There is nothing to reverse.'); return; }
    undoMove(game);
    profile.helps.undo--;
    render();
    say('Move reversed.');
  } else if (h === 'hammer') {
    hammerArmed = true;
    render();
    say('Tap any tile to smash it and a matching tile. Tap the hammer again to cancel.');
    return;
  }
  saveAll();
});

function smash(id) {
  const ids = hammer(game, id);
  hammerArmed = false;
  if (!ids) { say('That tile cannot be smashed.'); return render(); }
  profile.helps.hammer--;
  render();
  say('Smashed!');
  afterMove();
}

// ---------- end of round ----------

function dialog(title, bodyHTML, buttons) {
  $('dlgTitle').textContent = title;
  $('dlgBody').innerHTML = bodyHTML;
  const row = $('dlgButtons');
  row.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = `btn ${b.cls || ''}`;
    el.textContent = b.label;
    el.addEventListener('click', () => { if (!b.keepOpen) closeDialog(); b.onClick && b.onClick(el); });
    row.appendChild(el);
    b.el = el;
  }
  $('overlay').hidden = false;
  return buttons;
}

function closeDialog() {
  $('overlay').hidden = true;
}

async function finish(result) {
  tick();
  const entry = { date: new Date().toISOString(), level: game.level, result, ms: game.elapsedMs, used: { ...game.used }, tiles: game.tiles.length };
  const prize = recordResult(profile, result);
  await store.addHistory(entry);
  return prize;
}

function trayFull() {
  const held = profile.helps.undo;
  const cost = carryOnCost(held);
  let costText;
  if (held >= 4) costText = `This uses 4 of your ${held} reverse moves.`;
  else if (held > 0) costText = `You have ${plural(held, 'reverse move')}, so ${held === 1 ? 'it' : 'all of them'} will be used.`;
  else costText = 'You have no reverse moves, so this one is on the house.';
  $('tray').classList.add('warn');
  setTimeout(() => $('tray').classList.remove('warn'), 700);
  dialog('The tray is full', `<p>No pair among the four. You can start this level again, or carry on: the tray tiles go back where they came from.</p><p>${costText}</p>`, [
    { label: 'Restart', onClick: async () => { await finish('lost'); game = newGame(profile.level); await saveAll(); startGameView(); } },
    { label: 'Carry on', cls: 'primary', onClick: async () => {
      carryOn(game);
      profile.helps.undo -= cost;
      render();
      say(cost ? `Back on the board. ${plural(cost, 'reverse move')} used.` : 'Back on the board.');
      await saveAll();
    } },
  ]);
}

async function levelWon() {
  const done = game;
  const prize = await finish('won');
  game = null;
  await saveAll();
  let body = `<p>Cleared in ${fmtTime(done.elapsedMs)}.</p>`;
  const used = HELPS.filter(h => done.used[h]).map(h => `${HELP_NAMES[h].toLowerCase()} × ${done.used[h]}`);
  if (used.length) body += `<p>Helps used: ${used.join(', ')}.</p>`;
  if (prize && prize.type === 'all') body += `<p><strong>A prize for ${prize.level} levels:</strong> one of every help has been added.</p>`;
  else if (prize) body += `<p><strong>A prize for ${prize.level} levels!</strong></p>`;
  else body += `<p>Next prize in ${plural(levelsToNextPrize(done.level), 'level')}.</p>`;
  dialog(`Level ${done.level} complete`, body, [
    { label: 'Home', onClick: () => show('home') },
    prize && prize.type === 'pick'
      ? { label: 'Choose prize', cls: 'primary', onClick: () => choosePrize(() => nextLevel()) }
      : { label: 'Next level', cls: 'primary', onClick: () => nextLevel() },
  ]);
}

function nextLevel() {
  game = newGame(profile.level);
  saveAll();
  startGameView();
}

function maybeShowPendingPrize() {
  if (profile.pendingPrize) choosePrize(() => {});
}

function choosePrize(then) {
  const prize = profile.pendingPrize;
  if (!prize) return then();
  const picks = [];
  const n = prize.count;
  const body = `<p>Choose ${n === 1 ? 'one help' : `${n} helps (the same one more than once is fine)`}.</p>
    <div class="picker">${HELPS.map(h => `<button class="btn" data-pick="${h}"><b>${profile.helps[h]}</b>${HELP_NAMES[h]}</button>`).join('')}</div>
    <p class="chosen" id="chosen"></p>`;
  const [clearB, doneB] = dialog(`Your prize`, body, [
    { label: 'Clear', keepOpen: true, onClick: () => { picks.length = 0; update(); } },
    { label: 'Done', cls: 'primary', onClick: async () => { applyPrize(profile, prize, picks); await saveAll(); if (game) render(); then(); } },
  ]);
  function update() {
    $('chosen').textContent = picks.length ? `Chosen: ${picks.map(h => HELP_NAMES[h]).join(', ')}` : '';
    doneB.el.disabled = picks.length !== n;
    clearB.el.disabled = !picks.length;
    for (const b of $('dlgBody').querySelectorAll('[data-pick]')) b.disabled = picks.length >= n;
  }
  for (const b of $('dlgBody').querySelectorAll('[data-pick]')) {
    b.addEventListener('click', () => { if (picks.length < n) picks.push(b.dataset.pick); update(); });
  }
  update();
}

$('restartBtn').addEventListener('click', () => {
  if (busy) return;
  if (!game.moves) { game = newGame(profile.level); return startGameView(); }
  dialog(`Start level ${game.level} again?`, '<p>This game will be recorded as unfinished.</p>', [
    { label: 'Keep playing' },
    { label: 'Start again', cls: 'primary', onClick: async () => { await finish('abandoned'); game = newGame(profile.level); await saveAll(); startGameView(); } },
  ]);
});

$('homeBtn').addEventListener('click', () => { hammerArmed = false; saveAll(); show('home'); });

// ---------- progress ----------

async function renderProgress() {
  const s = profile.stats;
  const stats = [
    [profile.level - 1, 'Levels done'],
    [s.won, 'Won'],
    [s.played, 'Played'],
    [`${winRate(profile)}%`, 'Win rate'],
    [currentStreak(profile), 'Day streak'],
    [profile.streak.best, 'Best streak'],
  ];
  $('stats').innerHTML = stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  const toGo = levelsToNextPrize(profile.level - 1);
  $('nextPrize').textContent = `Next prize in ${plural(toGo, 'level')} (at level ${profile.level - 1 + toGo}).`;
  $('stock').innerHTML = HELPS.map(h => `<div><b>${profile.helps[h]}</b>${HELP_NAMES[h]}</div>`).join('');
  const hist = await store.getHistory();
  const label = { won: 'Won', lost: 'Tray full', abandoned: 'Unfinished' };
  $('history').innerHTML = hist.length
    ? hist.slice(0, historyShown).map(h => `<li><span>Level ${h.level}</span><span>${fmtTime(h.ms)}</span><span class="res ${h.result}">${label[h.result]}</span><span class="when">${fmtDate(h.date)}</span></li>`).join('')
    : '<li class="empty">No games finished yet.</li>';
  $('moreHistory').hidden = hist.length <= historyShown;
  $('persistNote').textContent = (await store.isPersisted())
    ? 'Your progress is stored on this device and protected from automatic clearing. A backup file is still wise before changing phones.'
    : 'Your progress is stored on this device. Save a backup file now and then, in case it is ever cleared.';
}

$('moreHistory').addEventListener('click', () => { historyShown += 50; renderProgress(); });

$('backupBtn').addEventListener('click', async () => {
  tick();
  await saveAll();
  const data = await store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tile-and-error-backup-${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

$('restoreBtn').addEventListener('click', () => $('restoreFile').click());
$('restoreFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { return dialog('Cannot read that file', '<p>It does not look like a backup file.</p>', [{ label: 'OK' }]); }
  const lv = data && data.profile ? data.profile.level : '?';
  dialog('Restore this backup?', `<p>Backup from ${data.exported ? fmtDate(data.exported) : 'an unknown date'}, at level ${lv}.</p><p>This replaces everything currently saved in the app.</p>`, [
    { label: 'Cancel' },
    { label: 'Restore', cls: 'primary', onClick: async () => {
      try {
        await store.importAll(data);
        await load();
        show('progress');
        say('');
      } catch (err) {
        dialog('Restore failed', `<p>${err.message}</p>`, [{ label: 'OK' }]);
      }
    } },
  ]);
});

// ---------- settings ----------

function renderSettings() {
  $('setDim').checked = profile.settings.dimBlocked;
  $('palPaper').checked = profile.settings.palette !== 'soft';
  $('palSoft').checked = profile.settings.palette === 'soft';
  $('version').textContent = `Tile & Error · version ${VERSION}`;
  updateInstallUI();
}
$('setDim').addEventListener('change', e => { profile.settings.dimBlocked = e.target.checked; saveAll(); });
for (const id of ['palPaper', 'palSoft']) {
  $(id).addEventListener('change', e => { if (e.target.checked) { profile.settings.palette = e.target.value; saveAll(); } });
}

// ---------- installing ----------
// Chrome offers its direct install route (the 'beforeinstallprompt' event) only when it believes
// the app is installable and not already installed. We catch it and offer our own button.

let installEvent = null;
let installOffered = false;
const standalone = () => matchMedia('(display-mode: standalone)').matches;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  installOffered = true;
  updateInstallUI();
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  updateInstallUI('Installed. Tile and Error should now be in your app list.');
});

function updateInstallUI(note) {
  for (const id of ['installBtn', 'installBtn2']) $(id).hidden = !installEvent || standalone();
  let text;
  if (note) text = note;
  else if (standalone()) text = 'You are using the installed app.';
  else if (installEvent) text = 'Chrome is ready to install the app. Tap the button below.';
  else text = 'Chrome has not offered to install the app on this page. This usually means Chrome believes it is already installed. If you are asked, a screenshot of this section helps.';
  $('installNote').textContent = text;
  const ua = navigator.userAgent;
  const rows = [
    ['Version', VERSION],
    ['Address', location.origin + location.pathname],
    ['Installed app', standalone() ? 'yes' : 'no (running in the browser)'],
    ['Install offered', installOffered ? 'yes' : 'no'],
    ['Offline helper', navigator.serviceWorker && navigator.serviceWorker.controller ? 'active' : 'not active'],
    ['Chrome', (ua.match(/Chrome\/([\d.]+)/) || [, 'unknown'])[1]],
    ['Android', (ua.match(/Android ([\d.]+)/) || [, 'unknown'])[1]],
  ];
  $('diag').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

async function install() {
  if (!installEvent) return updateInstallUI();
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  updateInstallUI(outcome === 'accepted' ? 'Installing. It can take a minute to appear in your app list.' : 'Installation was cancelled. Reload the page to try again.');
}
$('installBtn').addEventListener('click', install);
$('installBtn2').addEventListener('click', install);

// ---------- start up ----------

async function load() {
  profile = (await store.get('profile')) || newProfile();
  profile.settings = { ...newProfile().settings, ...profile.settings };
  game = (await store.get('current')) || null;
  if (game && game.level !== profile.level) game = null;
  // Games saved by an earlier version used different tiles; start those levels afresh.
  if (game && game.tiles.some(t => !isFace(t.face))) game = null;
  // A game saved mid-dialogue resumes in the right state.
  await store.set('profile', profile);
}

async function init() {
  await load();
  updateInstallUI();
  show('home');
  if (game && game.status === 'trayFull') {
    // Bring them straight back to the decision.
    startGameView();
    trayFull();
  }
  store.persist().catch(() => {});
  if ('serviceWorker' in navigator) {
    // When an updated version takes over, reload once so the new files (and app settings) are used.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; saveAll().finally(() => location.reload()); }
    });
    const register = () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    if (document.readyState === 'complete') register(); else window.addEventListener('load', register);
  }
}

init();

// For testing in the browser console.
window.__tileAndError = { get game() { return game; }, get profile() { return profile; }, get busy() { return busy; }, render };

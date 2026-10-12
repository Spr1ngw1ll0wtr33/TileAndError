// Screens, drawing and touch handling for Tile & Error.

import * as store from './store.js';
import { faceSVG, faceName } from './tiles.js';
import { sameGroup } from './rules.js';
import { newGame, tapTile, freeIds, undoMove, canUndo, findHint, shuffleBoard, hammer, carryOn, carryOnCost, TRAY_SIZE } from './game.js';
import { newProfile, recordResult, recordPlayDay, currentStreak, applyPrize, levelsToNextPrize, winRate, HELPS, HELP_NAMES } from './progress.js';

const VERSION = '1.0.2';
const $ = id => document.getElementById(id);

let profile = null;
let game = null;
let resumedAt = 0; // when the clock last started for the current game
let busy = false; // true while a tile is flying
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
  if (view === 'game') requestAnimationFrame(layoutBoard);
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
  $('homeMotif').innerHTML = `<div class="tile">${faceSVG('drR')}</div>`;
}

$('playBtn').addEventListener('click', () => {
  if (!game || game.level !== profile.level) game = newGame(profile.level);
  startGameView();
});

// ---------- game drawing ----------

function startGameView() {
  hammerArmed = false;
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
  if (!game || $('game').hidden) return;
  const wrap = $('boardWrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const cols = (Math.max(...game.tiles.map(t => t.x)) + 2) / 2;
  const rows = (Math.max(...game.tiles.map(t => t.y)) + 2) / 2;
  const maxZ = Math.max(...game.tiles.map(t => t.z));
  const depth = 0.09; // how far each layer shifts, as a share of tile width
  const pad = 10;
  const tw = Math.min(96, (W - pad) / (cols + maxZ * depth), (H - pad) / (rows * 4 / 3 + maxZ * depth));
  const th = tw * 4 / 3;
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
}
window.addEventListener('resize', () => requestAnimationFrame(layoutBoard));

function render() {
  const free = freeIds(game);
  const inTray = new Set(game.tray);
  const showIndex = profile.settings.cornerIndex;
  $('board').classList.toggle('dim', profile.settings.dimBlocked);
  $('board').classList.toggle('armed', hammerArmed);
  for (const t of game.tiles) {
    const el = tileEls.get(t.id);
    const faceKey = `${t.face}|${showIndex}`;
    if (el.dataset.face !== faceKey) {
      el.innerHTML = faceSVG(t.face, showIndex);
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
    slots[i].innerHTML = id !== undefined ? `<div class="tile">${faceSVG(game.tiles[id].face, showIndex)}</div>` : '';
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

$('board').addEventListener('click', e => {
  const el = e.target.closest('.tile');
  if (!el || busy) return;
  const id = Number(el.dataset.id);
  if (hammerArmed) return smash(id);
  play(id, el);
});

async function play(id, el) {
  if (game.status !== 'playing') return;
  if (!freeIds(game).has(id)) {
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    say('That tile is not free yet.');
    return;
  }
  say('');
  recordPlayDay(profile);
  // Work out where it lands, so it can fly there.
  const partner = game.tray.find(o => sameGroup(game.tiles[o].face, game.tiles[id].face));
  const slotIndex = partner !== undefined ? game.tray.indexOf(partner) : game.tray.length;
  const from = el.getBoundingClientRect();
  const to = $('tray').children[Math.min(slotIndex, TRAY_SIZE - 1)].getBoundingClientRect();
  busy = true;
  const clone = el.cloneNode(true);
  clone.classList.add('flying');
  clone.classList.remove('blocked', 'hint');
  Object.assign(clone.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, zIndex: '50' });
  document.body.appendChild(clone);
  el.style.visibility = 'hidden';
  await nextFrame();
  Object.assign(clone.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
  await wait(180);
  const result = tapTile(game, id);
  render();
  if (result && result.matched) {
    clone.style.opacity = '0';
    clone.style.transform = 'scale(.6)';
    await wait(150);
  }
  clone.remove();
  busy = false;
  afterMove();
}

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
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
  $('setIndex').checked = profile.settings.cornerIndex;
  $('version').textContent = `Tile & Error · version ${VERSION}`;
}
$('setDim').addEventListener('change', e => { profile.settings.dimBlocked = e.target.checked; saveAll(); });
$('setIndex').addEventListener('change', e => { profile.settings.cornerIndex = e.target.checked; saveAll(); });

// ---------- start up ----------

async function load() {
  profile = (await store.get('profile')) || newProfile();
  profile.settings = { ...newProfile().settings, ...profile.settings };
  game = (await store.get('current')) || null;
  if (game && game.level !== profile.level) game = null;
  // A game saved mid-dialogue resumes in the right state.
  await store.set('profile', profile);
}

async function init() {
  await load();
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
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();

// For testing in the browser console.
window.__tileAndError = { get game() { return game; }, get profile() { return profile; }, render };

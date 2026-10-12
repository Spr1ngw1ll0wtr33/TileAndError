import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newProfile, prizeFor, recordResult, applyPrize, recordPlayDay, currentStreak, winRate } from '../js/progress.js';

test('start with one of each help', () => {
  assert.deepEqual(newProfile().helps, { hint: 1, shuffle: 1, undo: 1, hammer: 1 });
});

test('prizes at 10, 50 and 100', () => {
  assert.equal(prizeFor(9), null);
  assert.deepEqual(prizeFor(10), { level: 10, type: 'pick', count: 1 });
  assert.deepEqual(prizeFor(50), { level: 50, type: 'pick', count: 3 });
  assert.deepEqual(prizeFor(100), { level: 100, type: 'all' });
  assert.deepEqual(prizeFor(150), { level: 150, type: 'pick', count: 3 });
  assert.deepEqual(prizeFor(200), { level: 200, type: 'all' });
});

test('winning level 10 leaves a prize to choose; level 100 gives one of each', () => {
  const p = newProfile();
  p.level = 10;
  recordResult(p, 'won');
  assert.equal(p.level, 11);
  assert.equal(p.pendingPrize.count, 1);
  applyPrize(p, p.pendingPrize, ['hammer']);
  assert.equal(p.helps.hammer, 2);
  assert.equal(p.pendingPrize, null);
  p.level = 100;
  recordResult(p, 'won');
  assert.deepEqual(p.helps, { hint: 2, shuffle: 2, undo: 2, hammer: 3 });
});

test('a pick-3 prize can repeat the same help', () => {
  const p = newProfile();
  applyPrize(p, { type: 'pick', count: 3 }, ['undo', 'undo', 'hint']);
  assert.equal(p.helps.undo, 3);
  assert.equal(p.helps.hint, 2);
});

test('losses and abandons do not advance the level', () => {
  const p = newProfile();
  recordResult(p, 'lost');
  recordResult(p, 'abandoned');
  recordResult(p, 'won');
  assert.equal(p.level, 2);
  assert.deepEqual(p.stats, { played: 3, won: 1, lost: 1, abandoned: 1 });
  assert.equal(winRate(p), 33);
});

test('daily streak counts consecutive days, across month ends, and lapses after a gap', () => {
  const p = newProfile();
  recordPlayDay(p, '2026-10-30');
  recordPlayDay(p, '2026-10-30');
  recordPlayDay(p, '2026-10-31');
  recordPlayDay(p, '2026-11-01');
  assert.equal(p.streak.current, 3);
  assert.equal(currentStreak(p, '2026-11-02'), 3);
  assert.equal(currentStreak(p, '2026-11-03'), 0);
  recordPlayDay(p, '2026-11-05');
  assert.equal(p.streak.current, 1);
  assert.equal(p.streak.best, 3);
});

test('streak handles the clocks going back (25-hour day)', () => {
  const p = newProfile();
  recordPlayDay(p, '2026-10-24');
  recordPlayDay(p, '2026-10-25');
  recordPlayDay(p, '2026-10-26');
  assert.equal(p.streak.current, 3);
});

// Player profile: level reached, help stock, prizes, results and daily streak.

export const HELPS = ['hint', 'shuffle', 'undo', 'hammer'];

export const HELP_NAMES = { hint: 'Hint', shuffle: 'Shuffle', undo: 'Reverse move', hammer: 'Hammer' };

export function newProfile() {
  return {
    version: 1,
    level: 1, // the level to play next
    helps: { hint: 1, shuffle: 1, undo: 1, hammer: 1 },
    stats: { played: 0, won: 0, lost: 0, abandoned: 0 },
    streak: { current: 0, best: 0, lastDay: null },
    settings: { dimBlocked: true, cornerIndex: true },
    pendingPrize: null, // a prize won but not yet chosen
    created: new Date().toISOString(),
  };
}

/** The prize for completing `level`, or null. The biggest one that applies wins. */
export function prizeFor(level) {
  if (level % 100 === 0) return { level, type: 'all' };
  if (level % 50 === 0) return { level, type: 'pick', count: 3 };
  if (level % 10 === 0) return { level, type: 'pick', count: 1 };
  return null;
}

/** Levels to go until the next prize after completing `completed` levels. */
export function levelsToNextPrize(completed) {
  return 10 - (completed % 10);
}

/** Add prize items. `choice` is a list of help names for a 'pick' prize. */
export function applyPrize(profile, prize, choice = []) {
  if (prize.type === 'all') for (const h of HELPS) profile.helps[h]++;
  else for (const h of choice.slice(0, prize.count)) profile.helps[h]++;
  profile.pendingPrize = null;
}

/** Local calendar day as yyyy-mm-dd. */
export function dayKey(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Note that the player played today. */
export function recordPlayDay(profile, today = dayKey()) {
  const s = profile.streak;
  if (s.lastDay === today) return;
  s.current = s.lastDay && daysBetween(s.lastDay, today) === 1 ? s.current + 1 : 1;
  s.best = Math.max(s.best, s.current);
  s.lastDay = today;
}

/** The streak as it stands today (it lapses if yesterday was missed). */
export function currentStreak(profile, today = dayKey()) {
  const s = profile.streak;
  if (!s.lastDay) return 0;
  return daysBetween(s.lastDay, today) <= 1 ? s.current : 0;
}

/** Record a finished game: 'won', 'lost' or 'abandoned'. Returns any prize earned. */
export function recordResult(profile, result) {
  profile.stats.played++;
  profile.stats[result]++;
  if (result !== 'won') return null;
  const completed = profile.level;
  profile.level++;
  const prize = prizeFor(completed);
  if (prize && prize.type === 'all') applyPrize(profile, prize);
  else if (prize) profile.pendingPrize = prize;
  return prize;
}

export function winRate(profile) {
  const { played, won } = profile.stats;
  return played ? Math.round((won / played) * 100) : 0;
}

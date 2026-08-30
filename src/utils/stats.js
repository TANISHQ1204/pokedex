/**
 * Pure analytics helpers for battle history + card pulls.
 *
 * All of these are deterministic and testable with plain node (no Supabase/env deps).
 *
 * Battle history row shape:
 *   {
 *     id, user_id,
 *     result: 'won' | 'lost' | 'draw',
 *     mode: 'solo' | 'friend',
 *     opponent_type: 'cpu' | 'friend',
 *     opponent_id,
 *     opponent_team: [pokemonId, ...],   // species ids the user faced
 *     player_team:   [pokemonId, ...],
 *     turns: integer,
 *     created_at: ISO string
 *   }
 *
 * Card pull row shape:
 *   { id, user_id, pokemon_id, card_type: 'normal'|'power'|'ancient',
 *     star_level, is_shiny, was_new, created_at }
 */

const DAY_MS = 86400000;

/** Parse a row's created_at to a Date safely. */
function rowDate(createdAt) {
  const d = createdAt ? new Date(createdAt) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

/** Sort history chronologically oldest -> newest. */
export function sortHistoryAsc(history) {
  return [...(history || [])].sort(
    (a, b) => (rowDate(a?.created_at)?.getTime() || 0) - (rowDate(b?.created_at)?.getTime() || 0)
  );
}

/**
 * Compute the overall battle record + streaks.
 * A 'draw' counts toward total but breaks any win streak (it is neither a win nor a loss).
 */
export function computeBattleRecord(history = []) {
  const asc = sortHistoryAsc(history);

  let total = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  asc.forEach((b) => {
    if (!b) return;
    total += 1;
    if (b.result === 'won') {
      wins += 1;
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else if (b.result === 'lost') {
      losses += 1;
      currentStreak = 0;
    } else {
      draws += 1;
      // a draw ends a run of consecutive wins
      currentStreak = 0;
    }
  });

  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return {
    total,
    wins,
    losses,
    draws,
    currentStreak,
    longestStreak,
    winRate,
  };
}

/**
 * Battles per day for the last `days` days (today inclusive).
 * Returns [{ label, dateKey, count, isToday }] oldest -> newest.
 */
export function computeBattlesPerDay(history = [], days = 14) {
  const buckets = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const countByDay = new Map();
  (history || []).forEach((b) => {
    const d = rowDate(b?.created_at);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    countByDay.set(key, (countByDay.get(key) || 0) + 1);
  });

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY_MS);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const isToday = i === 0;
    buckets.push({
      label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      dateKey: key,
      count: countByDay.get(key) || 0,
      isToday,
    });
  }

  return buckets;
}

/**
 * Which Pokemon species have appeared most often as opponents.
 * Ties broken by lowest pokemon id. Returns top `topN` entries [{ pokemonId, count }].
 */
export function computeMostFoughtOpponents(history = [], topN = 5) {
  const counts = new Map();

  (history || []).forEach((b) => {
    const team = Array.isArray(b?.opponent_team) ? b.opponent_team : [];
    team.forEach((rawId) => {
      const id = Number(rawId);
      if (Number.isInteger(id) && id > 0) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    });
  });

  return Array.from(counts.entries())
    .map(([pokemonId, count]) => ({ pokemonId, count }))
    .sort((a, b) => b.count - a.count || a.pokemonId - b.pokemonId)
    .slice(0, topN);
}

/**
 * The single most-decisive victory: the win achieved in the fewest turns.
 * Returns { turns, opponentLead, date, mode, opponentName } or null when no wins exist.
 */
export function findFastestWin(history = []) {
  let best = null;

  (history || []).forEach((b) => {
    if (b?.result !== 'won') return;
    const turns = Number(b?.turns) || 0;
    if (turns <= 0) return;
    if (!best || turns < best.turns) {
      const team = Array.isArray(b?.opponent_team) ? b.opponent_team : [];
      best = {
        turns,
        opponentLead: team.length > 0 ? Number(team[0]) : null,
        opponentName: b?.opponent_name || (b?.mode === 'friend' ? 'a friend' : 'the CPU'),
        date: rowDate(b?.created_at) || null,
        mode: b?.mode || 'solo',
      };
    }
  });

  return best;
}

/** Format a Date as a short human string, e.g. "Aug 12, 2026". */
export function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Human-ish "time ago" string, e.g. "3h ago", "2d ago", "just now". */
export function formatTimeAgo(createdAt, now = new Date()) {
  const d = rowDate(createdAt);
  if (!d) return '';
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Summarize recent pulls for the compact Home widget:
 * total card pulls recorded + the single most recent pull.
 */
export function summarizePulls(pulls = []) {
  const sorted = [...(pulls || [])].sort(
    (a, b) => (rowDate(b?.created_at)?.getTime() || 0) - (rowDate(a?.created_at)?.getTime() || 0)
  );
  return {
    total: sorted.length,
    recent: sorted[0] || null,
  };
}
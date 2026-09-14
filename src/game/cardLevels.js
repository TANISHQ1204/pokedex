/**
 * Card leveling constants + move-unlock helpers for the 10-star collection.
 *
 * STAR PROGRESSION (choose in plan):
 *   star_level = min(10, 1 + floor(dupes_collected / 2))
 *   → 10 stars = 18 total dupes.
 *
 * SHINY: unlocked only at max star (10). Migration preserves any previously
 * earned shinies (they were earned at the old max and remain earned).
 *
 * MOVE UNLOCKS (per star):
 *   Star 1  → 4 moves unlocked (baseline battle set)
 *   Star 2  → 5, ..., Star 10 → 13 moves unlocked (full learnset)
 *   Unlocked count = clamp(starLevel + 3, 4, 13), capped by learnset length.
 *   A team member's random 4-move battle set is drawn from UNLOCKED moves only
 *   (CPU battles, player's side). See buildUnlockPool.
 */

export const MAX_STAR_LEVEL = 10;
export const SHINY_STAR_LEVEL = 10;
export const BASE_UNLOCKED_MOVES = 4;
export const MAX_UNLOCKED_MOVES = 13;

/**
 * Number of moves unlocked for a given star level (1..10).
 * Formula: star + 3 → 4 .. 13.
 */
export function unlockedMoveCount(starLevel) {
  const star = Number.isFinite(starLevel) ? Math.round(starLevel) : 1;
  const clamped = Math.max(1, Math.min(MAX_STAR_LEVEL, star || 1));
  return Math.max(BASE_UNLOCKED_MOVES, Math.min(MAX_UNLOCKED_MOVES, clamped + 3));
}

/**
 * The move that becomes newly unlocked when a card's star level increases
 * from prevStar to prevStar + 1. Returns null when nothing new is available.
 * @param {Array} learnset - Ordered learnset (index = unlock order)
 * @param {number} prevStar - Star level BEFORE the upgrade
 * @returns {Object|null}
 */
export function newlyUnlockedMove(learnset = [], prevStar = 1) {
  if (!Array.isArray(learnset) || learnset.length === 0) return null;
  const prevCount = unlockedMoveCount(prevStar);
  const idx = Math.min(learnset.length - 1, prevCount);
  return prevCount < learnset.length ? learnset[idx] : null;
}

/**
 * Builds the unlocked-move pool (Map<pokemonId, move[]>) for a player's
 * collection. Each species' unlocked moves = the first `unlockedMoveCount(star)`
 * entries of its ordered learnset (star is the player's card star level).
 *
 * Power/Ancient records never contribute (fully independent card types).
 *
 * @param {Array} collection - user collection records from Supabase
 * @param {Object} learnsets - src/data/learnsets.json (keyed by pokemon id)
 * @returns {Map<number, Array>}
 */
export function buildUnlockPool(collection = [], learnsets = {}) {
  const map = new Map();
  if (!Array.isArray(collection)) return map;
  collection.forEach((entry) => {
    if (!entry || entry.pokemon_id == null || entry.is_power_card || entry.is_ancient_card) return;
    const id = Number(entry.pokemon_id);
    const learnset = (learnsets || {})[id] || (learnsets || {})[String(id)];
    if (!Array.isArray(learnset) || learnset.length === 0) return;
    const star = Math.max(1, Math.min(MAX_STAR_LEVEL, Number(entry.star_level) || 1));
    const count = Math.min(learnset.length, unlockedMoveCount(star));
    map.set(id, learnset.slice(0, count));
  });
  return map;
}

/**
 * Star-tier visual metadata — one distinct look per star level. Applied via the
 * `star-tier-N` CSS class on collection cards, plus the label for tooltips.
 */
export const STAR_TIERS = [
  { star: 1, label: 'Common' },
  { star: 2, label: 'Uncommon' },
  { star: 3, label: 'Rare' },
  { star: 4, label: 'Epic' },
  { star: 5, label: 'Elite' },
  { star: 6, label: 'Radiant' },
  { star: 7, label: 'Golden' },
  { star: 8, label: 'Prismatic' },
  { star: 9, label: 'Aurora' },
  { star: 10, label: 'Shiny Master' },
];

export function starTierInfo(starLevel) {
  const star = Math.max(1, Math.min(MAX_STAR_LEVEL, Number(starLevel) || 1));
  return STAR_TIERS.find((t) => t.star === star) || STAR_TIERS[0];
}
/**
 * Card leveling constants + move-unlock helpers for the 20-star collection.
 *
 * STAR PROGRESSION:
 *   star_level = min(20, 1 + dupes_collected)
 *   → 20 stars = 19 total dupes.
 *   → Each duplicate adds exactly one star.
 *
 * SHINY: unlocked at max star (20). Migration preserves any previously earned
 * shinies because they were earned at the old max and remain earned.
 *
 * MOVE UNLOCKS (per star):
 *   Star 1  → 4 moves unlocked (baseline battle set)
 *   Star 2  → 5, ..., Star 10 → 13 moves unlocked (full learnset)
 *   Stars 11-20 keep the same full learnset.
 *   Unlocked count = clamp(starLevel + 3, 4, 13), capped by learnset length.
 *   A team member's random 4-move battle set is drawn from UNLOCKED moves only
 *   (CPU battles, player's side). See buildUnlockPool.
 */

export const MAX_STAR_LEVEL = 20;
export const SHINY_STAR_LEVEL = 20;
export const BASE_UNLOCKED_MOVES = 4;
export const MAX_UNLOCKED_MOVES = 13;

/**
 * Number of moves unlocked for a given star level (1..20).
 * Formula: star + 3 → 4 .. 13, then capped from star 10 onward.
 */
export function unlockedMoveCount(starLevel) {
  const star = Number.isFinite(starLevel) ? Math.round(starLevel) : 1;
  const clamped = Math.max(1, Math.min(MAX_STAR_LEVEL, star || 1));
  return Math.max(BASE_UNLOCKED_MOVES, Math.min(MAX_UNLOCKED_MOVES, clamped + 3));
}

/**
 * Calculates a card's star level from its duplicate count.
 * Each duplicate is worth one star: 0 dupes = 1★, 19 dupes = 20★.
 *
 * `preservedStar` prevents downgrades when migrating legacy rows whose stored
 * star level is ahead of their duplicate count. Cards never lose progress.
 *
 * @param {number} dupesCollected
 * @param {number} preservedStar
 * @returns {number} Star level from 1 to 20
 */
export function starLevelFromDupes(dupesCollected, preservedStar = 1) {
  const dupes = Math.max(0, Math.floor(Number(dupesCollected) || 0));
  const preserved = Math.max(1, Math.floor(Number(preservedStar) || 1));
  return Math.min(MAX_STAR_LEVEL, Math.max(preserved, 1 + dupes));
}

/**
 * Duplicate count required to justify a stored star level. Used by migration
 * so a legacy 10★ card is not downgraded to 1★ when its old duplicate count
 * used the previous 2-dupes-per-star formula.
 *
 * @param {number} starLevel
 * @param {number} currentDupes
 * @returns {number}
 */
export function minimumDupesForStar(starLevel, currentDupes = 0) {
  const star = Math.max(1, Math.min(MAX_STAR_LEVEL, Math.floor(Number(starLevel) || 1)));
  const dupes = Math.max(0, Math.floor(Number(currentDupes) || 0));
  return Math.min(MAX_STAR_LEVEL - 1, Math.max(dupes, star - 1));
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
  { star: 10, label: 'Celestial' },
  { star: 11, label: 'Eclipse' },
  { star: 12, label: 'Nebula' },
  { star: 13, label: 'Inferno' },
  { star: 14, label: 'Glacier' },
  { star: 15, label: 'Venom' },
  { star: 16, label: 'Tempest' },
  { star: 17, label: 'Mythic' },
  { star: 18, label: 'Divine' },
  { star: 19, label: 'Ascendant' },
  { star: 20, label: 'Shiny Master' },
];

export function clampStarLevel(starLevel) {
  return Math.max(1, Math.min(MAX_STAR_LEVEL, Math.floor(Number(starLevel) || 1)));
}

export function starTierInfo(starLevel) {
  const star = clampStarLevel(starLevel);
  return STAR_TIERS.find((t) => t.star === star) || STAR_TIERS[0];
}

/**
 * Shared CSS hook for the 20 card identities. The matching rules live in
 * index.css and expose `--tier-*` variables to cards, meters, and frames.
 */
export function starTierClass(starLevel) {
  return `star-tier-${clampStarLevel(starLevel)}`;
}

/**
 * One distinct color per star tier, matching the rarity-card visual theme.
 * Shared by the collection, detail modal, reveal card, and battle surfaces so
 * star visuals stay consistent app-wide.
 */
export const STAR_TIER_COLORS = {
  1: '#94a3b8', // Common
  2: '#4ade80', // Uncommon
  3: '#38bdf8', // Rare
  4: '#a78bfa', // Epic
  5: '#f472b6', // Elite
  6: '#fbbf24', // Radiant
  7: '#f59e0b', // Golden
  8: '#22d3ee', // Prismatic
  9: '#34d399', // Aurora
  10: '#818cf8', // Celestial
  11: '#6366f1', // Eclipse
  12: '#c084fc', // Nebula
  13: '#fb923c', // Inferno
  14: '#67e8f9', // Glacier
  15: '#a3e635', // Venom
  16: '#60a5fa', // Tempest
  17: '#fb7185', // Mythic
  18: '#fde047', // Divine
  19: '#f8fafc', // Ascendant
  20: '#e879f9', // Shiny Master
};

export function starTierColor(starLevel) {
  const star = Math.max(1, Math.min(MAX_STAR_LEVEL, Number(starLevel) || 1));
  return STAR_TIER_COLORS[star] || '#94a3b8';
}
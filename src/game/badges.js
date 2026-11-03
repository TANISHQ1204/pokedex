import { getCollectionProgress } from './trophies.js';
import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL } from './cardLevels.js';
import { getBadgeFamily } from '../data/awards.js';

export const MILESTONE_CRITERIA = new Set(['ownedCount', 'shinyCount', 'maxedCount']);

const MASTERY_EXEMPT_FAMILIES = new Set(['regional', 'milestone']);

/**
 * Badges that stay ownership/threshold-based instead of requiring every member
 * of the set to reach MAX_STAR_LEVEL.
 */
export function badgeRequiresMastery(badge) {
  if (!badge) return false;
  if (MILESTONE_CRITERIA.has(badge.criteria)) return false;
  return !MASTERY_EXEMPT_FAMILIES.has(getBadgeFamily(badge));
}

/**
 * Normalizes the player collection into a Map of pokemon_id -> normal record.
 * Excludes Power/Ancient (independent trophy records).
 */
function normalizeMap(playerCollection) {
  if (!playerCollection) return new Map();

  const map = new Map();
  if (playerCollection instanceof Map) {
    playerCollection.forEach((entry, key) => {
      if (
        entry &&
        !entry.is_power_card &&
        !entry.isPowerCard &&
        !entry.is_ancient_card &&
        !entry.isAncientCard
      ) {
        const id = Number(entry.pokemon_id ?? key);
        if (Number.isFinite(id)) map.set(id, entry);
      }
    });
    return map;
  }

  if (Array.isArray(playerCollection)) {
    playerCollection.forEach((entry) => {
      if (
        entry &&
        entry.pokemon_id != null &&
        !entry.is_power_card &&
        !entry.isPowerCard &&
        !entry.is_ancient_card &&
        !entry.isAncientCard &&
        !map.has(Number(entry.pokemon_id))
      ) {
        map.set(Number(entry.pokemon_id), entry);
      }
    });
  }
  return map;
}

/**
 * Calculates badge status (earned / locked) for a badge object.
 *
 * Milestone badges use { criteria: 'ownedCount' | 'shinyCount' | 'maxedCount',
 * threshold } and only count normal (non-Power, non-Ancient) records.
 *
 * Regional Champion badges stay ownership-based: 100% of the set owned.
 *
 * Every other badge requires mastery: every member of the set must be owned and
 * reach MAX_STAR_LEVEL (20 stars). This includes legacy { pokemonIds } badges,
 * lore set badges, Champion-family badges, and `star20` mastery badges.
 *
 * @param {Object} badge - { id, name, region, badgeIcon, pokemonIds, [criteria] }
 * @param {Array|Map} playerCollection - User's collection records
 * @returns {Object} { isUnlocked, ownedCount, masteredCount, totalCount, progressPercent, requirement }
 */
export function getBadgeStatus(badge, playerCollection) {
  const progress = getCollectionProgress(badge, playerCollection);
  const ids = Array.isArray(badge?.pokemonIds) ? badge.pokemonIds : [];

  if (MILESTONE_CRITERIA.has(badge?.criteria)) {
    const map = normalizeMap(playerCollection);
    const threshold = Math.max(1, Math.floor(Number(badge.threshold) || 1));
    let currentCount = 0;

    if (badge.criteria === 'shinyCount') {
      map.forEach((entry) => {
        if (
          entry.is_shiny ||
          entry.isShiny ||
          Number(entry.star_level) >= SHINY_STAR_LEVEL
        ) {
          currentCount++;
        }
      });
    } else if (badge.criteria === 'maxedCount') {
      map.forEach((entry) => {
        if (Number(entry.star_level) >= MAX_STAR_LEVEL) currentCount++;
      });
    } else {
      currentCount = map.size;
    }

    return {
      isUnlocked: currentCount >= threshold,
      ownedCount: currentCount,
      masteredCount: currentCount,
      totalCount: threshold,
      currentCount,
      threshold,
      progressPercent: Math.min(100, Math.round((currentCount / threshold) * 100)),
      requirement: 'milestone',
    };
  }

  if (badgeRequiresMastery(badge)) {
    const map = normalizeMap(playerCollection);
    const masteredCount = ids.filter((id) => {
      const entry = map.get(Number(id));
      return entry && Number(entry.star_level) >= MAX_STAR_LEVEL;
    }).length;
    const totalCount = ids.length || 1;
    return {
      isUnlocked: masteredCount === totalCount,
      ownedCount: progress.ownedCount,
      masteredCount,
      totalCount,
      progressPercent: Math.round((masteredCount / totalCount) * 100),
      requirement: 'mastery',
    };
  }

  return {
    isUnlocked: progress.isComplete,
    ownedCount: progress.ownedCount,
    masteredCount: 0,
    totalCount: progress.totalCount,
    progressPercent: progress.progressPercent,
    requirement: 'ownership',
  };
}
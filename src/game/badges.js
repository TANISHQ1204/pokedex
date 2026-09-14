import { getCollectionProgress } from './trophies.js';
import { MAX_STAR_LEVEL } from './cardLevels.js';

/**
 * Normalizes the player collection into a Map of pokemon_id -> normal record.
 * Excludes Power/Ancient (independent trophy records).
 */
function normalizeMap(playerCollection) {
  if (!playerCollection) return new Map();
  if (playerCollection instanceof Map) return playerCollection;
  const map = new Map();
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
 * Legacy badges { pokemonIds } unlock when 100% of the set is owned.
 * Star-mastery badges { criteria: 'star10', pokemonIds } also require every
 * member of the set to reach MAX_STAR_LEVEL (10★).
 *
 * @param {Object} badge - { id, name, region, badgeIcon, pokemonIds, [criteria] }
 * @param {Array|Map} playerCollection - User's collection records
 * @returns {Object} { isUnlocked, ownedCount, masteredCount, totalCount, progressPercent }
 */
export function getBadgeStatus(badge, playerCollection) {
  const progress = getCollectionProgress(badge, playerCollection);
  const ids = Array.isArray(badge?.pokemonIds) ? badge.pokemonIds : [];

  if (badge?.criteria === 'star10') {
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
    };
  }

  return {
    isUnlocked: progress.isComplete,
    ownedCount: progress.ownedCount,
    masteredCount: 0,
    totalCount: progress.totalCount,
    progressPercent: progress.progressPercent,
  };
}
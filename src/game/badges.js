import { getCollectionProgress } from './trophies.js';
import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL } from './cardLevels.js';

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
 * Legacy badges { pokemonIds } unlock when 100% of the set is owned.
 * Star-mastery badges { criteria: 'star20', pokemonIds } also require every
 * member of the set to reach MAX_STAR_LEVEL (20 stars). `star10` is accepted as
 * a legacy alias so older saved badge data keeps working.
 * Milestone badges use { criteria: 'ownedCount' | 'shinyCount' | 'maxedCount',
 * threshold } and only count normal (non-Power, non-Ancient) records.
 *
 * @param {Object} badge - { id, name, region, badgeIcon, pokemonIds, [criteria] }
 * @param {Array|Map} playerCollection - User's collection records
 * @returns {Object} { isUnlocked, ownedCount, masteredCount, totalCount, progressPercent }
 */
export function getBadgeStatus(badge, playerCollection) {
  const progress = getCollectionProgress(badge, playerCollection);
  const ids = Array.isArray(badge?.pokemonIds) ? badge.pokemonIds : [];

  if (badge?.criteria === 'star20' || badge?.criteria === 'star10') {
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

  if (badge?.criteria === 'ownedCount' || badge?.criteria === 'shinyCount' || badge?.criteria === 'maxedCount') {
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
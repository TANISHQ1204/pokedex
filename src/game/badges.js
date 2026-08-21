import { getCollectionProgress } from './trophies.js';

/**
 * Calculates binary badge status (earned / locked) for a curated badge set.
 * Unlocks strictly when 100% of the badge set is owned in user's collection.
 * 
 * @param {Object} badge - Badge set object { id, name, region, badgeIcon, pokemonIds: [] }
 * @param {Array|Map} playerCollection - User's collection records from Supabase
 * @returns {Object} { isUnlocked, ownedCount, totalCount, progressPercent }
 */
export function getBadgeStatus(badge, playerCollection) {
  const progress = getCollectionProgress(badge, playerCollection);
  return {
    isUnlocked: progress.isComplete,
    ownedCount: progress.ownedCount,
    totalCount: progress.totalCount,
    progressPercent: progress.progressPercent,
  };
}

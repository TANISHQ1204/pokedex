/**
 * Helper to normalize playerCollection parameter into a Map of pokemon_id -> entry object.
 */
function normalizeCollectionMap(playerCollection) {
  if (!playerCollection) return new Map();
  if (playerCollection instanceof Map) return playerCollection;

  const map = new Map();
  if (Array.isArray(playerCollection)) {
    playerCollection.forEach((entry) => {
      if (entry && entry.pokemon_id != null) {
        map.set(Number(entry.pokemon_id), entry);
      }
    });
  }
  return map;
}

/**
 * Calculates progress for a given collection against user's collection.
 * 
 * @param {Object} collection - { id, name, pokemonIds: [] }
 * @param {Array|Map} playerCollection - User's collection records from Supabase
 * @returns {Object} { ownedCount, totalCount, progressPercent, isComplete, avgStarLevel }
 */
export function getCollectionProgress(collection, playerCollection) {
  if (!collection || !Array.isArray(collection.pokemonIds)) {
    return {
      ownedCount: 0,
      totalCount: 0,
      progressPercent: 0,
      isComplete: false,
      avgStarLevel: 0,
    };
  }

  const map = normalizeCollectionMap(playerCollection);
  const totalCount = collection.pokemonIds.length;
  if (totalCount === 0) {
    return {
      ownedCount: 0,
      totalCount: 0,
      progressPercent: 100,
      isComplete: true,
      avgStarLevel: 0,
    };
  }

  let ownedCount = 0;
  let totalStarLevelSum = 0;

  collection.pokemonIds.forEach((id) => {
    const entry = map.get(Number(id));
    if (entry) {
      ownedCount += 1;
      totalStarLevelSum += Number(entry.star_level || 1);
    }
  });

  const isComplete = ownedCount === totalCount;
  const progressPercent = Math.round((ownedCount / totalCount) * 100);
  const rawAvg = ownedCount > 0 ? totalStarLevelSum / ownedCount : 0;
  const avgStarLevel = Number(rawAvg.toFixed(1));

  return {
    ownedCount,
    totalCount,
    progressPercent,
    isComplete,
    avgStarLevel,
  };
}

/**
 * Determines trophy tier based on collection progress and average star level.
 * 
 * Tier Rules:
 * - Locked until 100% of collection is owned.
 * - Bronze: 100% owned, avg star level 1 - 2.9
 * - Silver: 100% owned, avg star level 3 - 4.9
 * - Gold: 100% owned, avg star level 5
 * 
 * @param {Object} collection - Collection object
 * @param {Array|Map} playerCollection - User's collection records
 * @returns {Object} { tier, tierName, icon, color, progress }
 */
export function getTrophyTier(collection, playerCollection) {
  const progress = getCollectionProgress(collection, playerCollection);

  if (!progress.isComplete) {
    return {
      tier: 'locked',
      tierName: 'Locked',
      icon: '🔒',
      color: '#64748b',
      progress,
    };
  }

  if (progress.avgStarLevel >= 5) {
    return {
      tier: 'gold',
      tierName: 'Gold Trophy',
      icon: '🏆',
      color: '#fbbf24',
      progress,
    };
  }

  if (progress.avgStarLevel >= 3) {
    return {
      tier: 'silver',
      tierName: 'Silver Trophy',
      icon: '🥈',
      color: '#94a3b8',
      progress,
    };
  }

  return {
    tier: 'bronze',
    tierName: 'Bronze Trophy',
    icon: '🥉',
    color: '#b45309',
    progress,
  };
}

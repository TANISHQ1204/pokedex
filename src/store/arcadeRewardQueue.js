import { upsertCachedEntry } from './collectionCache.js';
import { syncCardProgress } from './collection.js';
import { recordCardPull } from './stats.js';
import {
  getPendingArcadeRewardCount,
  readArcadeRewardQueue,
  removePendingArcadeAward,
} from './arcadeRewardQueueData.js';

export {
  getPendingArcadeRewardCount,
  mergeQueuedAward,
  queueArcadeAward,
  readArcadeRewardQueue,
  removePendingArcadeAward,
  writeArcadeRewardQueue,
} from './arcadeRewardQueueData.js';

const activeFlushes = new Map();

function isNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return error instanceof TypeError
    || message.includes('fetch')
    || message.includes('network')
    || message.includes('timeout')
    || message.includes('load failed');
}

/**
 * Push queued arcade awards to Supabase. Safe to call repeatedly; returns the
 * number of awards still pending. Stops early on network failures so the queue
 * can retry when connectivity returns.
 */
export async function flushArcadeRewards(userId) {
  if (!userId) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return getPendingArcadeRewardCount(userId);
  }
  if (activeFlushes.has(userId)) return activeFlushes.get(userId);

  const flush = (async () => {
    const pending = readArcadeRewardQueue(userId);

    for (const award of pending) {
      try {
        const result = await syncCardProgress(userId, award);
        if (result.entry) upsertCachedEntry(userId, result.entry);

        void recordCardPull({
          userId,
          pokemonId: award.pokemonId,
          cardType: 'normal',
          starLevel: result.entry?.star_level || award.starLevel || 1,
          isShiny: Boolean(result.entry?.is_shiny),
          wasNew: Boolean(result.isNew),
        });

        removePendingArcadeAward(userId, award.pokemonId);
      } catch (error) {
        console.error('Could not sync arcade reward:', error);
        if (
          isNetworkError(error)
          || (typeof navigator !== 'undefined' && navigator.onLine === false)
        ) {
          break;
        }
      }
    }

    return getPendingArcadeRewardCount(userId);
  })();

  activeFlushes.set(userId, flush);

  try {
    return await flush;
  } finally {
    activeFlushes.delete(userId);
  }
}

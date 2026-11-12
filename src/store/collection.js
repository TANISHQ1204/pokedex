import { supabase, isSupabaseConfigured } from './supabaseClient';
import { findNormalRecord, mergeCollectionRecords } from '../utils/cardTypes';
import {
  MAX_STAR_LEVEL,
  SHINY_STAR_LEVEL,
  starLevelFromDupes,
} from '../game/cardLevels.js';
import {
  readCollectionCache,
  upsertCachedEntry,
  writeCollectionCache,
} from './collectionCache.js';

const MOCK_COLLECTION_KEY = 'pokedex_mock_normal_collection';

/**
 * Fetch the user's full card collection from Supabase.
 * @param {string} userId - Auth user UUID
 * @param {{ allowCache?: boolean }} options - fall back to the local cache on failure
 * @returns {Promise<Array>} Array of collection records
 */
export async function getUserCollection(userId, { allowCache = false } = {}) {
  if (!userId) return [];

  try {
    // Page through the table so large collections (or duplicate-row buildup) are
    // never truncated by the API's default row cap.
    const PAGE_SIZE = 1000;
    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('pokemon_id', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching user collection:', error.message);
        throw error;
      }

      const page = data || [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Merge any duplicate rows produced by the old upsert bug so every page sees
    // stable, recovered progression instead of stale first-row values.
    const merged = mergeCollectionRecords(rows);
    writeCollectionCache(userId, merged);
    return merged;
  } catch (error) {
    if (allowCache) {
      const cached = readCollectionCache(userId);
      if (cached) return cached;
      return [];
    }
    throw error;
  }
}

function buildCollectionPayload(entry) {
  return {
    user_id: entry.user_id,
    pokemon_id: entry.pokemon_id,
    star_level: entry.star_level ?? 1,
    dupes_collected: entry.dupes_collected ?? 0,
    is_shiny: entry.is_shiny ?? false,
    updated_at: new Date().toISOString(),
  };
}

/** Insert a brand-new card row when the user does not own the card yet. */
export async function insertCollectionEntry(entry) {
  if (!entry.user_id || !entry.pokemon_id) {
    throw new Error('user_id and pokemon_id are required to insert collection entry');
  }

  const { data, error } = await supabase
    .from('collections')
    .insert(buildCollectionPayload(entry))
    .select()
    .single();

  if (error) {
    console.error('Error inserting collection entry:', error.message);
    throw error;
  }

  return data;
}

/**
 * Update an existing collection row by its primary key. This avoids relying on
 * an onConflict target, which cannot match the database's partial unique indexes.
 */
export async function updateCollectionEntry(id, patch) {
  if (id == null) {
    throw new Error('A collection row id is required to update an entry');
  }

  const payload = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('collections')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating collection entry:', error.message);
    throw error;
  }

  return data;
}

/**
 * Backwards-compatible entry point: update by id when provided, else insert.
 */
export async function upsertCollectionEntry(entry) {
  if (entry?.id != null) {
    return updateCollectionEntry(entry.id, entry);
  }
  return insertCollectionEntry(entry);
}

async function deleteExtraCollectionRows(ids) {
  const extraIds = (ids || []).filter((id) => id != null);
  if (extraIds.length === 0) return;

  const { error } = await supabase.from('collections').delete().in('id', extraIds);
  if (error) {
    console.warn('Could not remove duplicate collection rows:', error.message);
  }
}

function cacheAwardEntry(userId, entry) {
  if (!entry || !readCollectionCache(userId)) return;
  upsertCachedEntry(userId, entry);
}

async function fetchCollectionRows(userId, pokemonId) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('pokemon_id', pokemonId);

  if (error) {
    console.error('Error checking existing card row:', error.message);
    throw error;
  }

  return data || [];
}

async function awardExistingCard(userId, pokemonId, existing, rows) {
  const rowIds = (rows || [])
    .filter(
      (row) =>
        row &&
        row.id != null &&
        !row.is_power_card &&
        !row.is_ancient_card &&
        !row.isPowerCard &&
        !row.isAncientCard
    )
    .map((row) => row.id);

  if (existing.star_level >= MAX_STAR_LEVEL) {
    const maxedEntry = existing.id != null
      ? await updateCollectionEntry(existing.id, {
          star_level: existing.star_level,
          dupes_collected: existing.dupes_collected,
          is_shiny: existing.is_shiny,
        })
      : existing;

    await deleteExtraCollectionRows(rowIds.filter((id) => id !== existing.id));
    cacheAwardEntry(userId, maxedEntry);

    return {
      isNew: false,
      entry: maxedEntry,
      starUpgraded: false,
      becameShiny: false,
      maxedOut: true,
    };
  }

  const currentDupes = Math.max(0, Number(existing.dupes_collected) || 0);
  const newDupes = Math.min(MAX_STAR_LEVEL - 1, currentDupes + 1);
  const newStarLevel = starLevelFromDupes(newDupes, existing.star_level);
  const starUpgraded = newStarLevel > (Number(existing.star_level) || 1);
  const becameShiny = !existing.is_shiny && newStarLevel >= SHINY_STAR_LEVEL;

  const updatedEntry = existing.id != null
    ? await updateCollectionEntry(existing.id, {
        star_level: newStarLevel,
        dupes_collected: newDupes,
        is_shiny: becameShiny || existing.is_shiny,
      })
    : await insertCollectionEntry({
        user_id: userId,
        pokemon_id: pokemonId,
        star_level: newStarLevel,
        dupes_collected: newDupes,
        is_shiny: becameShiny || existing.is_shiny,
      });

  await deleteExtraCollectionRows(rowIds.filter((id) => id !== existing.id));
  cacheAwardEntry(userId, updatedEntry);

  return {
    isNew: false,
    entry: updatedEntry,
    starUpgraded,
    becameShiny,
  };
}

/**
 * Award a card drop to the user upon battle victory.
 *
 * DUPLICATE & STAR LEVEL MECHANICS (Cumulative Counting):
 * - If user does NOT own this card: insert row with star_level=1, dupes_collected=0, is_shiny=false.
 * - If user DOES own this card and star_level < 20:
 *   - Increments dupes_collected by +1.
 *   - Each duplicate collected increases star_level by exactly +1 stage.
 *   - Formula: star_level = Math.min(20, 1 + dupes_collected).
 *   - 19 total duplicates reaches 20★ and unlocks shiny.
 *   - Stored star levels are never downgraded during migration.
 * - If star_level is already 20 (maxed): further drops of this pokemon_id are blocked.
 *
 * @param {string} userId - Auth user UUID
 * @param {number} pokemonId - Pokémon ID awarded
 * @returns {Promise<Object>} Award summary { isNew, entry, starUpgraded, becameShiny }
 */
export async function awardCard(userId, pokemonId) {
  if (!userId || !pokemonId) {
    throw new Error('userId and pokemonId are required to award a card');
  }

  const existingRows = await fetchCollectionRows(userId, pokemonId);
  const existing = findNormalRecord(mergeCollectionRecords(existingRows));

  if (existing) {
    return awardExistingCard(userId, pokemonId, existing, existingRows);
  }

  try {
    const newEntry = await insertCollectionEntry({
      user_id: userId,
      pokemon_id: pokemonId,
      star_level: 1,
      dupes_collected: 0,
      is_shiny: false,
    });

    cacheAwardEntry(userId, newEntry);

    return {
      isNew: true,
      entry: newEntry,
      starUpgraded: false,
      becameShiny: false,
    };
  } catch (error) {
    if (error?.code !== '23505') throw error;

    const retryRows = await fetchCollectionRows(userId, pokemonId);
    const retryExisting = findNormalRecord(mergeCollectionRecords(retryRows));

    if (!retryExisting) {
      console.error(
        'Collection insert hit a duplicate key but no matching card row is visible. Check the unique constraint and RLS policies.',
        { userId, pokemonId, retryRows }
      );
      throw error;
    }

    return awardExistingCard(userId, pokemonId, retryExisting, retryRows);
  }
}

/**
 * DESTRUCTIVE ACTION — Reset the player's card collection.
 *
 * Deletes every collection row for the given user, wiping all star levels,
 * dupes, and shiny flags as if starting fresh.
 *
 * Explicitly does NOT touch:
 *   - friends / friendships
 *   - battle history / stats
 *   - username / profile / any other account data
 *
 * This action is IRREVERSIBLE. Callers must confirm with the user beforehand.
 *
 * @param {string} userId - Auth user UUID
 * @returns {Promise<{ success: boolean, deletedCount: number }>}
 */
export async function resetNormalCollection(userId) {
  if (!userId) {
    throw new Error('userId is required to reset the collection');
  }

  if (!isSupabaseConfigured()) {
    // Preview / mock mode: spin down the local mock collection store.
    const key = `${MOCK_COLLECTION_KEY}_${userId}`;
    const raw = localStorage.getItem(key);
    const deletedCount = raw ? JSON.parse(raw).length : 0;
    localStorage.removeItem(key);
    writeCollectionCache(userId, []);
    return { success: true, deletedCount };
  }

  const { data, error } = await supabase
    .from('collections')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) {
    console.error('Error resetting collection:', error.message);
    throw error;
  }

  writeCollectionCache(userId, []);

  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
}

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  findNormalRecord,
  findPowerRecord,
  findAncientRecord,
  mergeCollectionRecords,
} from '../utils/cardTypes';
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
    is_power_card: entry.is_power_card ?? false,
    is_ancient_card: entry.is_ancient_card ?? false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Insert a brand-new card row. Used only when no matching row of that card type
 * exists, so a normal award can never overwrite a Power/Ancient record.
 */
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

/**
 * Award a Pokémon card drop to the user upon battle victory.
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

  // 1. Fetch existing rows for this user & pokemon_id, then select ONLY the standard
  // (normal) card row. Power Cards and Ancient Cards are FULLY INDEPENDENT records:
  // owning one of those must never be treated as ownership of the normal card, and
  // never receive this normal-card dupe/star update.
  const { data: existingRows, error: fetchErr } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('pokemon_id', pokemonId);

  if (fetchErr) {
    console.error('Error checking existing card row:', fetchErr.message);
    throw fetchErr;
  }

  // Merge duplicate rows first so a stale first row can never freeze progression.
  const mergedRows = mergeCollectionRecords(existingRows || []);
  const existing = findNormalRecord(mergedRows);
  const normalRowIds = (existingRows || [])
    .filter((row) => row && !row.is_power_card && !row.is_ancient_card && row.id != null)
    .map((row) => row.id);

  // Case A: User does not own this card yet
  if (!existing) {
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
  }

  // Case B: Card is already maxed out at MAX_STAR_LEVEL (20) stars
  if (existing.star_level >= MAX_STAR_LEVEL) {
    // Persist the recovered merged values on the keeper row before returning.
    const maxedEntry = existing.id != null
      ? await updateCollectionEntry(existing.id, {
          star_level: existing.star_level,
          dupes_collected: existing.dupes_collected,
          is_shiny: existing.is_shiny,
        })
      : existing;

    await deleteExtraCollectionRows(normalRowIds.filter((id) => id !== existing.id));
    cacheAwardEntry(userId, maxedEntry);

    return {
      isNew: false,
      entry: maxedEntry,
      starUpgraded: false,
      becameShiny: false,
      maxedOut: true,
    };
  }

  // Case C: Card exists and star_level < MAX_STAR_LEVEL -> Increment dupes and calculate star level.
  const currentDupes = Math.max(0, Number(existing.dupes_collected) || 0);
  const newDupes = Math.min(MAX_STAR_LEVEL - 1, currentDupes + 1);
  // One duplicate = one star: min(20, 1 + dupes). Never downgrade legacy progress.
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

  await deleteExtraCollectionRows(normalRowIds.filter((id) => id !== existing.id));
  cacheAwardEntry(userId, updatedEntry);

  return {
    isNew: false,
    entry: updatedEntry,
    starUpgraded,
    becameShiny,
  };
}

/**
 * Award a bonus Power Card to the user.
 * Power Cards are unlevelable single-state trophy cards (is_power_card = true).
 * 
 * @param {string} userId - Auth user UUID
 * @param {number} pokemonId - Pokémon ID awarded
 * @returns {Promise<Object>} Award summary { isNew, entry, isPowerCard: true }
 */
export async function awardPowerCard(userId, pokemonId) {
  if (!userId || !pokemonId) {
    throw new Error('userId and pokemonId are required to award a power card');
  }

  // Fetch existing Power Card row — scoped to is_power_card records ONLY.
  const { data: existingRows, error: fetchErr } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('pokemon_id', pokemonId);

  const mergedRows = mergeCollectionRecords(existingRows || []);
  const existing = findPowerRecord(mergedRows);
  if (!fetchErr && existing) {
    const powerRowIds = (existingRows || [])
      .filter((row) => row && row.is_power_card && row.id != null)
      .map((row) => row.id);
    await deleteExtraCollectionRows(powerRowIds.filter((id) => id !== existing.id));
    return {
      isNew: false,
      entry: existing,
      isPowerCard: true,
      alreadyOwned: true,
    };
  }

  const newEntry = await insertCollectionEntry({
    user_id: userId,
    pokemon_id: pokemonId,
    star_level: 1,
    dupes_collected: 0,
    is_shiny: false,
    is_power_card: true,
  });

  return {
    isNew: true,
    entry: newEntry,
    isPowerCard: true,
  };
}

/**
 * Award a bonus Ancient Card to the user.
 * Ancient Cards are unlevelable single-state trophy cards (is_ancient_card = true).
 *
 * @param {string} userId - Auth user UUID
 * @param {number} pokemonId - Pokemon ID awarded
 * @returns {Promise<Object>} Award summary { isNew, entry, isAncientCard: true }
 */
export async function awardAncientCard(userId, pokemonId) {
  if (!userId || !pokemonId) {
    throw new Error('userId and pokemonId are required to award an ancient card');
  }

  // Fetch existing Ancient Card row — scoped to is_ancient_card records ONLY.
  const { data: existingRows, error: fetchErr } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('pokemon_id', pokemonId);

  const mergedRows = mergeCollectionRecords(existingRows || []);
  const existing = findAncientRecord(mergedRows);
  if (!fetchErr && existing) {
    const ancientRowIds = (existingRows || [])
      .filter((row) => row && row.is_ancient_card && row.id != null)
      .map((row) => row.id);
    await deleteExtraCollectionRows(ancientRowIds.filter((id) => id !== existing.id));
    return {
      isNew: false,
      entry: existing,
      isAncientCard: true,
      alreadyOwned: true,
    };
  }

  const newEntry = await insertCollectionEntry({
    user_id: userId,
    pokemon_id: pokemonId,
    star_level: 1,
    dupes_collected: 0,
    is_shiny: false,
    is_ancient_card: true,
  });

  return {
    isNew: true,
    entry: newEntry,
    isAncientCard: true,
  };
}

/**
 * DESTRUCTIVE ACTION — Reset ONLY the player's normal card collection.
 *
 * Deletes every NORMAL card record (is_power_card = false AND is_ancient_card = false)
 * for the given user, wiping all star levels, dupes, and shiny flags as if starting
 * fresh.
 *
 * Explicitly does NOT touch:
 *   - Power Cards / Ancient Cards (Special Collection data) — preserved intact
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
    throw new Error('userId is required to reset the normal collection');
  }

  if (!isSupabaseConfigured()) {
    // Preview / mock mode: spin down the local mock normal-collection store.
    const key = `${MOCK_COLLECTION_KEY}_${userId}`;
    const raw = localStorage.getItem(key);
    const deletedCount = raw ? JSON.parse(raw).length : 0;
    localStorage.removeItem(key);
    const cached = readCollectionCache(userId) || [];
    writeCollectionCache(
      userId,
      cached.filter((row) => row.is_power_card || row.is_ancient_card)
    );
    return { success: true, deletedCount };
  }

  // Delete ONLY normal card rows — every special card (power/ancient) stays untouched.
  const { data, error } = await supabase
    .from('collections')
    .delete()
    .eq('user_id', userId)
    .eq('is_power_card', false)
    .eq('is_ancient_card', false);

  if (error) {
    console.error('Error resetting normal collection:', error.message);
    throw error;
  }

  const cached = readCollectionCache(userId) || [];
  writeCollectionCache(
    userId,
    cached.filter((row) => row.is_power_card || row.is_ancient_card)
  );

  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
}

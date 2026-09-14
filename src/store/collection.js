import { supabase, isSupabaseConfigured } from './supabaseClient';
import { findNormalRecord, findPowerRecord, findAncientRecord } from '../utils/cardTypes';
import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL } from '../game/cardLevels.js';

const MOCK_COLLECTION_KEY = 'pokedex_mock_normal_collection';

/**
 * Fetch the user's full card collection from Supabase.
 * @param {string} userId - Auth user UUID
 * @returns {Promise<Array>} Array of collection records
 */
export async function getUserCollection(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('pokemon_id', { ascending: true });

  if (error) {
    console.error('Error fetching user collection:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Add or update a card entry in the user's collection (upsert by user_id + pokemon_id).
 */
export async function upsertCollectionEntry(entry) {
  if (!entry.user_id || !entry.pokemon_id) {
    throw new Error('user_id and pokemon_id are required to upsert collection entry');
  }

  const payload = {
    user_id: entry.user_id,
    pokemon_id: entry.pokemon_id,
    star_level: entry.star_level ?? 1,
    dupes_collected: entry.dupes_collected ?? 0,
    is_shiny: entry.is_shiny ?? false,
    is_power_card: entry.is_power_card ?? false,
    is_ancient_card: entry.is_ancient_card ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('collections')
    .upsert(payload, { onConflict: entry.is_power_card ? 'user_id,pokemon_id,is_power_card' : (entry.is_ancient_card ? 'user_id,pokemon_id,is_ancient_card' : 'user_id,pokemon_id') })
    .select()
    .single();

  if (error) {
    // If table schema unique constraint doesn't include is_power_card yet, fallback to normal upsert
    console.warn('Upsert notice (retrying basic payload if needed):', error.message);
    const { data: retryData, error: retryErr } = await supabase
      .from('collections')
      .upsert(payload)
      .select()
      .single();
    if (retryErr) {
      console.error('Error upserting collection entry:', retryErr.message);
      throw retryErr;
    }
    return retryData;
  }

  return data;
}

/**
 * Award a Pokémon card drop to the user upon battle victory.
 * 
 * DUPLICATE & STAR LEVEL MECHANICS (Cumulative Counting):
 * - If user does NOT own this card: insert row with star_level=1, dupes_collected=0, is_shiny=false.
 * - If user DOES own this card and star_level < 5:
 *   - Increments dupes_collected by +1.
 *   - dupes_collected accumulates continuously (1, 2, 3, 4+).
 *   - Each dupe collected increases star_level by exactly +1 stage.
 *   - Formula: star_level = Math.min(5, 1 + dupes_collected).
 *   - When star_level reaches 5 (max level, requiring 4 total dupes), is_shiny is set to true!
 * - If star_level is already 5 (maxed): further drops of this pokemon_id are blocked.
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

  const existing = findNormalRecord(existingRows);

  // Case A: User does not own this card yet
  if (!existing) {
    const newEntry = await upsertCollectionEntry({
      user_id: userId,
      pokemon_id: pokemonId,
      star_level: 1,
      dupes_collected: 0,
      is_shiny: false,
    });

    return {
      isNew: true,
      entry: newEntry,
      starUpgraded: false,
      becameShiny: false,
    };
  }

  // Case B: Card is already maxed out at MAX_STAR_LEVEL (10) stars
  if (existing.star_level >= MAX_STAR_LEVEL) {
    return {
      isNew: false,
      entry: existing,
      starUpgraded: false,
      becameShiny: false,
      maxedOut: true,
    };
  }

  // Case C: Card exists and star_level < MAX_STAR_LEVEL -> Increment dupes and calculate star level.
  const newDupes = (existing.dupes_collected || 0) + 1;
  // Star formula (chosen in plan): min(10, 1 + floor(dupes/2)) → 1★ @0-1, 10★ @18.
  // Never downgrade: preserved progress (e.g. pre-migration 5★ rows) stays put,
  // only upgraded once the new formula's level is actually higher.
  const formulaStar = Math.min(MAX_STAR_LEVEL, 1 + Math.floor(newDupes / 2));
  const newStarLevel = Math.max(Number(existing.star_level) || 1, formulaStar);
  const starUpgraded = newStarLevel > existing.star_level;
  const becameShiny = newStarLevel >= SHINY_STAR_LEVEL;

  const updatedEntry = await upsertCollectionEntry({
    user_id: userId,
    pokemon_id: pokemonId,
    star_level: newStarLevel,
    dupes_collected: newDupes,
    is_shiny: becameShiny || existing.is_shiny,
  });

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

  const existing = findPowerRecord(existingRows);
  if (!fetchErr && existing) {
    return {
      isNew: false,
      entry: existing,
      isPowerCard: true,
      alreadyOwned: true,
    };
  }

  const newEntry = await upsertCollectionEntry({
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

  const existing = findAncientRecord(existingRows);
  if (!fetchErr && existing) {
    return {
      isNew: false,
      entry: existing,
      isAncientCard: true,
      alreadyOwned: true,
    };
  }

  const newEntry = await upsertCollectionEntry({
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

  return { success: true, deletedCount: Array.isArray(data) ? data.length : 0 };
}

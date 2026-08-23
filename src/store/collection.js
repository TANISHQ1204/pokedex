import { supabase } from './supabaseClient';

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
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('collections')
    .upsert(payload, { onConflict: entry.is_power_card ? 'user_id,pokemon_id,is_power_card' : 'user_id,pokemon_id' })
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

  // 1. Fetch existing standard card row for this user & pokemon_id (excluding power cards)
  const { data: existingRows, error: fetchErr } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('pokemon_id', pokemonId)
    .or('is_power_card.eq.false,is_power_card.is.null');

  if (fetchErr) {
    console.error('Error checking existing card row:', fetchErr.message);
    throw fetchErr;
  }

  const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

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

  // Case B: Card is already maxed out at 5 stars
  if (existing.star_level >= 5) {
    return {
      isNew: false,
      entry: existing,
      starUpgraded: false,
      becameShiny: false,
      maxedOut: true,
    };
  }

  // Case C: Card exists and star_level < 5 -> Increment dupes and calculate star level
  const newDupes = (existing.dupes_collected || 0) + 1;
  // Calculate star level: each dupe = +1 star (max 5)
  const newStarLevel = Math.min(5, 1 + newDupes);
  const starUpgraded = newStarLevel > existing.star_level;
  const becameShiny = newStarLevel >= 5;

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

  // Fetch existing power card row
  const { data: existingRows, error: fetchErr } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('pokemon_id', pokemonId)
    .eq('is_power_card', true);

  if (!fetchErr && existingRows && existingRows.length > 0) {
    return {
      isNew: false,
      entry: existingRows[0],
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

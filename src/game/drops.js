import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };

/**
 * Rolls a random Pokémon card drop from available starters on battle victory.
 * 
 * Exclusion Rules:
 * - Excludes any pokemon_id where user's collection has reached star_level >= 5 (maxed).
 * - Equal odds across all eligible non-maxed starter Pokémon.
 * - Fallback to full pool if all cards in list are maxed.
 * 
 * @param {Array} userCollection - Array of collection records from Supabase
 * @param {Array} [customList=null] - Optional list of Pokémon templates
 * @returns {Object} Selected Pokémon template object
 */
export function rollCardDrop(userCollection = [], customList = null) {
  const list = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;

  // 1. Build set of maxed out pokemon_ids (star_level >= 5, excluding power cards)
  const maxedPokemonIds = new Set(
    userCollection
      .filter((item) => item && !item.is_power_card && !item.isPowerCard && item.star_level >= 5)
      .map((item) => Number(item.pokemon_id))
  );

  // 2. Filter eligible pool excluding maxed Pokémon
  let eligiblePool = list.filter((pkmn) => !maxedPokemonIds.has(Number(pkmn.id)));

  // Fallback to full list if user has maxed out every single card
  if (eligiblePool.length === 0) {
    eligiblePool = list;
  }

  // 3. Roll a random card from the eligible pool (equal probability)
  const randomIndex = Math.floor(Math.random() * eligiblePool.length);
  return eligiblePool[randomIndex];
}

/**
 * Rolls a bonus Power Card drop check (5% chance on battle victory).
 * 
 * Exclusion Rules:
 * - Excludes any pokemon_id where user's collection already owns a Power Card (is_power_card = true).
 * - Equal odds across all unowned Power Card Pokémon.
 * - Returns null if the 5% roll fails or if user already owns all Power Cards.
 * 
 * @param {Array} userCollection - Array of collection records from Supabase
 * @param {Array} [customList=null] - Optional list of Pokémon templates
 * @param {number} [rate=0.05] - Drop rate (default 5%)
 * @returns {Object|null} Selected Pokémon template object or null if no drop
 */
export function rollPowerCardDrop(userCollection = [], customList = null, rate = 0.05) {
  // 1. Roll probability check (5% default)
  if (Math.random() >= rate) {
    return null;
  }

  const list = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;

  // 2. Build set of owned Power Card pokemon_ids
  const ownedPowerCardIds = new Set(
    userCollection
      .filter((item) => item && (item.is_power_card || item.isPowerCard))
      .map((item) => Number(item.pokemon_id))
  );

  // 3. Filter eligible pool excluding already owned Power Cards
  const eligiblePool = list.filter((pkmn) => !ownedPowerCardIds.has(Number(pkmn.id)));

  if (eligiblePool.length === 0) {
    return null;
  }

  // 4. Select random Power Card from eligible pool
  const randomIndex = Math.floor(Math.random() * eligiblePool.length);
  return eligiblePool[randomIndex];
}

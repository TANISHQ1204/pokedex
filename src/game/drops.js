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

  // 1. Build set of maxed out pokemon_ids (star_level >= 5)
  const maxedPokemonIds = new Set(
    userCollection
      .filter((item) => item && item.star_level >= 5)
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

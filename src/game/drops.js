import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };

/**
 * Unified battle win drop resolver — Either/Or model.
 *
 * On a battle win, the player receives EITHER a normal card OR a special
 * collection card (Power Card or Ancient Card) — never both.
 *
 * Base rates:
 *   Power Card: 5%    |    Ancient Card: 3%    |    Normal: ~92.15%
 *
 * Completion boost — when ALL normal cards are maxed (star_level >= 5):
 *   Power Card: 40%   |    Ancient Card: 40%   |    Normal: ~24%
 *
 * Drop resolution per win:
 *  1. Roll Power Card
 *  2. Roll Ancient Card
 *  3. If both succeed → 50/50 pick between them
 *  4. If only one succeeds → that one wins (special card)
 *  5. If neither succeeds → normal card drop
 *
 * @param {Array} userCollection - Array of collection records from Supabase
 * @param {Array} [customList=null] - Optional list of Pokemon templates
 * @returns {{ type: 'normal'|'power'|'ancient', pokemon: Object, collectionComplete: boolean }} Drop result
 */
export function rollBattleDrop(userCollection = [], customList = null) {
  const list = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;

  // --- Check if normal collection is fully completed ---
  const collectionComplete = isNormalCollectionComplete(userCollection, list);

  // --- Determine rates based on completion ---
  const powerRate = collectionComplete ? 0.40 : 0.05;
  const ancientRate = collectionComplete ? 0.40 : 0.03;

  // --- Roll Power Card ---
  const powerWin = Math.random() < powerRate;
  let powerPkmn = null;
  if (powerWin) {
    const ownedPowerIds = new Set(
      userCollection
        .filter((r) => r && (r.is_power_card || r.isPowerCard))
        .map((r) => Number(r.pokemon_id))
    );
    const eligiblePower = list.filter((p) => !ownedPowerIds.has(Number(p.id)));
    if (eligiblePower.length > 0) {
      powerPkmn = eligiblePower[Math.floor(Math.random() * eligiblePower.length)];
    }
  }

  // --- Roll Ancient Card ---
  const ancientWin = Math.random() < ancientRate;
  let ancientPkmn = null;
  if (ancientWin) {
    const ownedAncientIds = new Set(
      userCollection
        .filter((r) => r && (r.is_ancient_card || r.isAncientCard))
        .map((r) => Number(r.pokemon_id))
    );
    const eligibleAncient = list.filter((p) => !ownedAncientIds.has(Number(p.id)));
    if (eligibleAncient.length > 0) {
      ancientPkmn = eligibleAncient[Math.floor(Math.random() * eligibleAncient.length)];
    }
  }

  // --- Resolve: special card wins over normal ---
  if (powerPkmn && ancientPkmn) {
    if (Math.random() < 0.5) {
      return { type: 'power', pokemon: powerPkmn, collectionComplete };
    }
    return { type: 'ancient', pokemon: ancientPkmn, collectionComplete };
  }

  if (powerPkmn) {
    return { type: 'power', pokemon: powerPkmn, collectionComplete };
  }

  if (ancientPkmn) {
    return { type: 'ancient', pokemon: ancientPkmn, collectionComplete };
  }

  // --- Normal card drop ---
  return { type: 'normal', pokemon: rollNormalCard(userCollection, list), collectionComplete };
}

/**
 * Checks if the user's normal card collection is fully completed.
 * Completion = every Pokemon in the list has a normal card entry at star_level >= 5.
 * Power cards and ancient cards are excluded from this check.
 *
 * @param {Array} userCollection
 * @param {Array} list - Pokemon template list
 * @returns {boolean}
 */
function isNormalCollectionComplete(userCollection, list) {
  if (!userCollection || userCollection.length === 0) return false;

  const maxedIds = new Set(
    userCollection
      .filter((r) => r && !r.is_power_card && !r.isPowerCard && !r.is_ancient_card && !r.isAncientCard && r.star_level >= 5)
      .map((r) => Number(r.pokemon_id))
  );

  return list.every((p) => maxedIds.has(Number(p.id)));
}

/**
 * Rolls a normal card drop from the pool.
 * Excludes Pokemon where the user has reached star_level >= 5 (fully maxed).
 * Fallback to full pool if all cards are maxed.
 *
 * @param {Array} userCollection
 * @param {Array} list
 * @returns {Object} Pokemon template
 */
function rollNormalCard(userCollection, list) {
  const maxedIds = new Set(
    userCollection
      .filter((r) => r && !r.is_power_card && !r.isPowerCard && !r.is_ancient_card && !r.isAncientCard && r.star_level >= 5)
      .map((r) => Number(r.pokemon_id))
  );

  let eligible = list.filter((p) => !maxedIds.has(Number(p.id)));
  if (eligible.length === 0) eligible = list;

  return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Preview/test mode drop — uses higher special rates for testing.
 * Returns the same shape as rollBattleDrop.
 */
export function rollPreviewDrop(customList = null) {
  const list = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;

  // Higher rates for preview: 15% power, 10% ancient
  const powerWin = Math.random() < 0.15;
  const ancientWin = !powerWin && Math.random() < 0.10;

  if (powerWin) {
    const pkmn = list[Math.floor(Math.random() * list.length)];
    return { type: 'power', pokemon: pkmn, collectionComplete: false };
  }
  if (ancientWin) {
    const pkmn = list[Math.floor(Math.random() * list.length)];
    return { type: 'ancient', pokemon: pkmn, collectionComplete: false };
  }

  return { type: 'normal', pokemon: list[Math.floor(Math.random() * list.length)], collectionComplete: false };
}

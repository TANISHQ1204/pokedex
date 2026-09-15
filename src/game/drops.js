import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };
import { MAX_STAR_LEVEL } from './cardLevels.js';

/**
 * Unified battle win drop resolver — Normal cards only.
 *
 * Special collection cards (Power Cards / Ancient Cards) were removed from the
 * drop pool: every battle win grants exactly one normal card. The normal pool
 * is the combined species + alternate-form list (collection catalog).
 *
 * @param {Array} userCollection - Array of collection records from Supabase
 * @param {Array} [customList=null] - Optional list of Pokemon templates
 * @returns {{ type: 'normal', pokemon: Object }} Drop result
 */
export function rollBattleDrop(userCollection = [], customList = null) {
  const list = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;
  return { type: 'normal', pokemon: rollNormalCard(userCollection, list) };
}

/**
 * Rolls a normal card drop from the pool.
 * Excludes Pokemon where the user has reached star_level >= MAX_STAR_LEVEL (fully maxed).
 * Fallback to full pool if all cards are maxed.
 *
 * @param {Array} userCollection
 * @param {Array} list
 * @returns {Object} Pokemon template
 */
function rollNormalCard(userCollection, list) {
  const maxedIds = new Set(
    userCollection
      .filter((r) => r && !r.is_power_card && !r.isPowerCard && !r.is_ancient_card && !r.isAncientCard && r.star_level >= MAX_STAR_LEVEL)
      .map((r) => Number(r.pokemon_id))
  );

  let eligible = list.filter((p) => !maxedIds.has(Number(p.id)));
  if (eligible.length === 0) eligible = list;

  return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Preview/test mode drop — returns a normal card for preview UI.
 * Same shape as rollBattleDrop.
 */
export function rollPreviewDrop(customList = null) {
  const list = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;
  return { type: 'normal', pokemon: list[Math.floor(Math.random() * list.length)] };
}
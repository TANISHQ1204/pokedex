import { MAX_STAR_LEVEL, STAR_TIERS } from './cardLevels.js';

function starFor(collectionMap, pokemonId) {
  const entry = collectionMap instanceof Map
    ? collectionMap.get(Number(pokemonId))
    : collectionMap?.[pokemonId] ?? collectionMap?.[Number(pokemonId)];
  if (!entry) return 0;
  return Math.max(1, Math.min(MAX_STAR_LEVEL, Math.floor(Number(entry.star_level) || 1)));
}

/**
 * Current Pokédex progression stage.
 *
 * Tier 1 is base ownership (own every card). Once every card is owned, the
 * tracker advances to tier 2 and measures how many cards have reached 2★. When
 * every card reaches 2★ it advances to 3★, and so on up to 20★ Shiny Master.
 *
 * @param {Map|Object} collectionMap - normal-card entries keyed by pokemon id
 * @param {Array} entries - Pokémon catalog entries to measure (full dex or a filter)
 * @returns {Object} tier progress summary
 */
export function computeDexTierProgress(collectionMap, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const total = list.length;

  if (total === 0) {
    return {
      tier: 1,
      label: STAR_TIERS[0].label,
      tierLabel: 'Base tier',
      owned: 0,
      achieved: 0,
      total: 0,
      remaining: 0,
      percent: 0,
      isComplete: true,
      isMaxed: false,
    };
  }

  const owned = list.reduce(
    (count, pokemon) => count + (starFor(collectionMap, pokemon.id) > 0 ? 1 : 0),
    0
  );

  let tier = 1;
  let achieved = owned;

  if (owned >= total) {
    for (let star = 2; star <= MAX_STAR_LEVEL; star += 1) {
      const count = list.reduce(
        (sum, pokemon) => sum + (starFor(collectionMap, pokemon.id) >= star ? 1 : 0),
        0
      );
      tier = star;
      achieved = count;
      if (count < total) break;
    }
  }

  const isComplete = achieved >= total;
  const isMaxed = isComplete && tier >= MAX_STAR_LEVEL;
  const percent = Math.round((achieved / total) * 100);
  const tierInfo = STAR_TIERS.find((item) => item.star === tier) || STAR_TIERS[0];

  return {
    tier,
    label: tierInfo.label,
    tierLabel: tier === 1 ? 'Base tier' : `Tier ${tier} · ${tierInfo.label}`,
    owned,
    achieved,
    total,
    remaining: Math.max(0, total - achieved),
    percent,
    isComplete,
    isMaxed,
  };
}

// Lore-driven runtime balance scaler.
//
// Base stats in the data files are already HP-boosted (raw HP x 1.2). This module
// layers a "lore tier" on top so iconic/legendary/ultra Pokemon feel correct in
// battle without regenerating any data. All values are runtime-only transformations.

export const SHINY_STAT_BOOST = 1.12;

// HP multiplier per lore tier, applied on top of the existing +20% HP boost.
// Tier 0: regular 'mons -> Tier 4: Mega / Primal / Gigantamax.
export const HP_TIER_FACTOR = [1.35, 1.5, 1.7, 1.9, 2.05];

// Move power bonus per lore tier. Weak moves are floored so they never whiff.
export const MOVE_POWER_FLOOR = 60;
export const MOVE_TIER_BONUS = [1.0, 1.05, 1.15, 1.3, 1.45];

export const TIER_NAMES = ['Common', 'Strong', 'Elite', 'Legendary', 'Mega/Ultra'];

function boostedBst(pokemon) {
  const stats = pokemon && pokemon.stats;
  if (!stats) return 0;
  return (
    Number(stats.hp) +
    Number(stats.attack) +
    Number(stats.defense) +
    Number(stats.specialAttack) +
    Number(stats.specialDefense) +
    Number(stats.speed)
  );
}

/**
 * Lore tier for a battle template or draft entry (0-4).
 *  4: Mega / Primal / Gigantamax / Terastal forms.
 *  3: rarer species (legendary/mythical) or very high BST.
 *  2: elite / pseudo-legendary range.
 *  1: solid battlers.
 *  0: everything else.
 */
export function loreTier(pokemon) {
  if (!pokemon) return 0;
  const bst = Number(pokemon.bst) || boostedBst(pokemon);
  const label = String(pokemon.label || pokemon.formLabel || '').toLowerCase();
  if (/\b(mega|primal|gigantamax|g-max|terastal)\b/.test(label)) return 4;
  if (pokemon.rarer || pokemon.isRarer || bst >= 600) return 3;
  if (bst >= 550) return 2;
  if (bst >= 430) return 1;
  return 0;
}

export function tierName(tier) {
  return TIER_NAMES[Math.max(0, Math.min(TIER_NAMES.length - 1, Number(tier) || 0))];
}

/**
 * Battle-effective stats for a Pokemon, shared by the battle engine and every
 * stat display in the UI so collection cards, the detail modal, and the arena
 * always agree on the numbers the player will actually fight with.
 */
export function computePokemonStats(pokemon, { isShiny = false, includeLore = true } = {}) {
  if (!pokemon || !pokemon.stats) return null;
  const tier = includeLore ? loreTier(pokemon) : 0;
  const hpFactor = includeLore ? HP_TIER_FACTOR[tier] : 1;
  const shiny = isShiny ? SHINY_STAT_BOOST : 1;

  const hp = Math.max(1, Math.round((Number(pokemon.stats.hp) || 1) * hpFactor * shiny));
  const stats = { hp };
  ['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'].forEach((key) => {
    stats[key] = Math.max(1, Math.round((Number(pokemon.stats[key]) || 1) * shiny));
  });

  return { ...stats, tier };
}

/**
 * Scale a single move's power for a Pokemon's lore tier. Non-damaging moves pass
 * through untouched; damaging moves get a floor + tier bonus.
 */
export function scaleMovePower(move, pokemon) {
  if (!move || typeof move.power !== 'number' || move.power <= 0) return move;
  const tier = loreTier(pokemon);
  const base = Math.max(MOVE_POWER_FLOOR, move.power);
  const scaled = Math.round(base * MOVE_TIER_BONUS[tier]);
  if (scaled === move.power) return move;
  return { ...move, power: scaled };
}
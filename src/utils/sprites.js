// Sprite resolution with a universal fallback chain so alternate forms and
// shiny variants always render something sensible in every surface:
//   1. direct sprite on the record (sprites.normal / sprites.shiny)
//   2. PokeAPI sprite CDN keyed by the BASE species id (dexNo)
// Chrome blocks broken image icons, so UI surfaces should render through
// <PokemonImage /> which walks this chain via onError.

export const POKEAPI_CDN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

export function spriteCdnUrl(id, shiny = false) {
  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${POKEAPI_CDN}${shiny ? 'shiny/' : ''}${numeric}.png`;
}

/** Preferred sprite for a record (falls back shiny<->normal). */
export function resolveSprite(pokemon, { isShiny = false } = {}) {
  if (!pokemon) return '';
  const sp = pokemon.sprites || {};
  const direct = isShiny ? sp.shiny : sp.normal;
  if (direct) return direct;
  if (sp.shiny || sp.normal) return sp.shiny || sp.normal;
  return spriteCdnUrl(pokemon.dexNo || pokemon.id, isShiny);
}

/**
 * Ordered candidate URLs for a record, best first. `PokemonImage` walks these
 * in order and stops at the first image that loads.
 */
export function spriteCandidates(pokemon, isShiny = false) {
  if (!pokemon) return [];
  const sp = pokemon.sprites || {};
  const candidates = [];
  if (isShiny && sp.shiny) candidates.push(sp.shiny);
  if (sp.normal) candidates.push(sp.normal);
  // Enriched draft/deal entries carry a pre-resolved single `sprite` value.
  if (candidates.length === 0 && pokemon.sprite) candidates.push(pokemon.sprite);
  const baseId = pokemon.dexNo || pokemon.id;
  if (baseId && candidates.length === 0) {
    if (isShiny) candidates.push(spriteCdnUrl(baseId, true));
    candidates.push(spriteCdnUrl(baseId, false));
  }
  return candidates;
}
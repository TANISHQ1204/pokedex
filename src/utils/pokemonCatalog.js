/**
 * Combined Pokémon catalog: main species + alternate forms.
 *
 * Exports a single merged list so alternate forms (ids 10001+) behave as
 * separate normal-collection collectibles everywhere the "collection" is
 * rendered, while battle team generation stays species-only (pokemon.json).
 */
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import formsList from '../data/forms.json' with { type: 'json' };

export const formList = formsList;
export const fullPokemonList = [...pokemonList, ...formsList];

const byId = new Map(fullPokemonList.map((p) => [Number(p.id), p]));

export function getPokemonById(id) {
  return byId.get(Number(id)) || null;
}

/** True for alternate-form records (ids 10001+, flagged kind: 'form'). */
export function isAltForm(p) {
  if (!p) return false;
  if (p.kind === 'form') return true;
  const id = Number(p.id);
  return id >= 10001;
}

/** Display name preferring the form's friendly name (e.g. "Alolan Meowth"). */
export function displayName(p) {
  if (!p) return '';
  if (p.display) return p.display;
  return p.name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
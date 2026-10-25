import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { displayName } from '../utils/pokemonCatalog.js';
import { maxScoreForRounds } from './arcadeScoring.js';
import { sample, shuffle } from './arcadeRandom.js';

export const MEMORY_DEX_PAIRS = 5;
export const MEMORY_DEX_TIME_LIMIT = 90;

const memoryPool = pokemonList.filter(
  (pokemon) => pokemon && Array.isArray(pokemon.types) && pokemon.types.length > 0
);

export function buildMemoryDexRun(pairCount = MEMORY_DEX_PAIRS, rng = Math.random) {
  const safePairs = Math.max(1, Math.floor(Number(pairCount) || 0));
  const selected = sample(memoryPool, safePairs, rng);
  const cards = selected.flatMap((pokemon, pairIndex) => [
    {
      id: `memory-${pokemon.id}-${pairIndex}-a`,
      pairId: Number(pokemon.id),
      pokemon,
      name: displayName(pokemon),
    },
    {
      id: `memory-${pokemon.id}-${pairIndex}-b`,
      pairId: Number(pokemon.id),
      pokemon,
      name: displayName(pokemon),
    },
  ]);

  return {
    pairs: selected.length,
    cards: shuffle(cards, rng),
    maxScore: maxScoreForRounds(selected.length),
  };
}

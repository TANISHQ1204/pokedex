import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { displayName } from '../utils/pokemonCatalog.js';
import { maxScoreForRounds } from './arcadeScoring.js';
import { sample, shuffle } from './arcadeRandom.js';

export const CATCH_RUSH_ROUNDS = 10;
export const CATCH_RUSH_TIME_LIMIT = 60;
export const CATCH_RUSH_OPTIONS = 9;

const catchPool = pokemonList.filter(
  (pokemon) => pokemon && Array.isArray(pokemon.types) && pokemon.types.length > 0
);

export function buildCatchRushRounds(count = CATCH_RUSH_ROUNDS, rng = Math.random) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 0));
  const targets = sample(catchPool, safeCount, rng);
  const rounds = [];

  for (const target of targets) {
    if (!target) continue;
    const distractors = sample(
      catchPool.filter((pokemon) => Number(pokemon.id) !== Number(target.id)),
      CATCH_RUSH_OPTIONS - 1,
      rng
    );
    const options = shuffle([target, ...distractors], rng);
    if (options.length !== CATCH_RUSH_OPTIONS) continue;
    if (new Set(options.map((pokemon) => Number(pokemon.id))).size !== CATCH_RUSH_OPTIONS) continue;

    rounds.push({
      id: `catch-${target.id}-${rounds.length}`,
      target,
      targetName: displayName(target),
      options,
    });
  }

  return rounds;
}

export function catchRushMaxScore(rounds = CATCH_RUSH_ROUNDS) {
  return maxScoreForRounds(rounds);
}

export function buildCatchRushRun(count = CATCH_RUSH_ROUNDS, rng = Math.random) {
  const rounds = buildCatchRushRounds(count, rng);
  return {
    rounds,
    maxScore: catchRushMaxScore(rounds.length),
  };
}

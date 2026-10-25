import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { displayName } from '../utils/pokemonCatalog.js';
import { TYPE_CHART, getTypeEffectiveness } from './battle.js';
import { maxScoreForRounds } from './arcadeScoring.js';
import { pickRandom, sample, shuffle } from './arcadeRandom.js';

export const TYPE_WEAVER_ROUNDS = 8;
export const TYPE_WEAVER_TIME_LIMIT = 75;
export const POKEMON_TYPES = Object.keys(TYPE_CHART);

const defenderPool = pokemonList.filter(
  (pokemon) => Array.isArray(pokemon.types) && pokemon.types.length > 0
);

export function typeLabel(type) {
  return String(type || '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function effectivenessLabel(multiplier) {
  const value = Number(multiplier) || 0;
  if (value === 0) return 'No effect';
  if (value >= 4) return '4x super effective';
  if (value >= 2) return '2x super effective';
  if (value >= 1) return 'Neutral';
  return `${value}x resisted`;
}

export function buildTypeWeaverRounds(count = TYPE_WEAVER_ROUNDS, rng = Math.random) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 0));
  const rounds = [];
  const usedIds = new Set();
  let attempts = 0;

  while (rounds.length < safeCount && attempts < safeCount * 30) {
    attempts += 1;
    const defender = pickRandom(defenderPool, rng);
    if (!defender || usedIds.has(Number(defender.id))) continue;
    usedIds.add(Number(defender.id));

    const scoredTypes = POKEMON_TYPES.map((type) => ({
      type,
      multiplier: getTypeEffectiveness(type, defender.types),
    }));
    const bestMultiplier = Math.max(...scoredTypes.map((entry) => entry.multiplier));
    const bestTypes = scoredTypes.filter((entry) => entry.multiplier === bestMultiplier);
    const correct = pickRandom(bestTypes, rng);
    const weakerTypes = scoredTypes.filter(
      (entry) => entry.type !== correct.type && entry.multiplier < bestMultiplier
    );
    const remainingTypes = scoredTypes.filter((entry) => entry.type !== correct.type);

    let distractors = sample(weakerTypes, 3, rng);
    if (distractors.length < 3) {
      const usedTypes = new Set([correct.type, ...distractors.map((entry) => entry.type)]);
      const filler = remainingTypes.filter((entry) => !usedTypes.has(entry.type));
      distractors = [...distractors, ...sample(filler, 3 - distractors.length, rng)];
    }

    const options = shuffle([correct, ...distractors], rng);
    if (options.length !== 4 || new Set(options.map((entry) => entry.type)).size !== 4) continue;

    rounds.push({
      id: `type-${defender.id}-${rounds.length}`,
      defender,
      defenderName: displayName(defender),
      bestMultiplier,
      correctType: correct.type,
      options,
    });
  }

  return rounds;
}

export function typeWeaverMaxScore(rounds = TYPE_WEAVER_ROUNDS) {
  return maxScoreForRounds(rounds);
}

export function buildTypeWeaverRun(count = TYPE_WEAVER_ROUNDS, rng = Math.random) {
  const rounds = buildTypeWeaverRounds(count, rng);
  return {
    rounds,
    maxScore: typeWeaverMaxScore(rounds.length),
  };
}

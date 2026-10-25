import evolutionPaths from '../data/evolutionPaths.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import speciesMeta from '../data/speciesMeta.json' with { type: 'json' };
import { getPokemonById, displayName } from '../utils/pokemonCatalog.js';
import { maxScoreForRounds } from './arcadeScoring.js';
import { sample, shuffle } from './arcadeRandom.js';

export const LINK_LAB_ROUNDS = 8;
export const LINK_LAB_TIME_LIMIT = 90;

const speciesCatalog = pokemonList
  .map((entry) => getPokemonById(entry.id))
  .filter(Boolean);

const usablePaths = evolutionPaths.filter(
  (path) => path.length >= 2 && path.every((id) => Boolean(getPokemonById(id)))
);

function speciesGeneration(id) {
  return speciesMeta[String(id)]?.gen || null;
}

function distractorCandidates(correctId, familyIds) {
  const generation = speciesGeneration(correctId);
  const sameGeneration = speciesCatalog.filter((pokemon) => {
    const id = Number(pokemon.id);
    return !familyIds.has(id) && speciesGeneration(id) === generation;
  });
  if (sameGeneration.length >= 3) return sameGeneration;
  return speciesCatalog.filter((pokemon) => !familyIds.has(Number(pokemon.id)));
}

export function buildLinkLabRounds(count = LINK_LAB_ROUNDS, rng = Math.random) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 0));
  const paths = shuffle(usablePaths, rng);
  const rounds = [];

  for (const path of paths) {
    if (rounds.length >= safeCount) break;

    const familyIds = new Set(path);
    const targetIndex = path.length === 2 ? 1 : 1 + Math.floor(rng() * (path.length - 1));
    const correctId = Number(path[targetIndex]);
    const correct = getPokemonById(correctId);
    if (!correct) continue;

    const distractors = sample(distractorCandidates(correctId, familyIds), 3, rng)
      .map((pokemon) => Number(pokemon.id));
    const optionIds = shuffle([correctId, ...distractors], rng);
    if (new Set(optionIds).size !== 4) continue;

    rounds.push({
      id: `link-${path.join('-')}-${targetIndex}-${rounds.length}`,
      path,
      targetIndex,
      correctId,
      correctName: displayName(correct),
      family: path.map((id) => getPokemonById(id)),
      options: optionIds.map((id) => getPokemonById(id)),
    });
  }

  return rounds;
}

export function linkLabMaxScore(rounds = LINK_LAB_ROUNDS) {
  return maxScoreForRounds(rounds);
}

export function buildLinkLabRun(count = LINK_LAB_ROUNDS, rng = Math.random) {
  const rounds = buildLinkLabRounds(count, rng);
  return {
    rounds,
    maxScore: linkLabMaxScore(rounds.length),
  };
}

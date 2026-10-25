import pokemonList from '../src/data/pokemon.json' with { type: 'json' };
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';
import { rollArcadeCards } from '../src/game/drops.js';
import { buildLinkLabRun } from '../src/game/linkLab.js';
import { buildTypeWeaverRun } from '../src/game/typeWeaver.js';
import { buildCatchRushRun } from '../src/game/catchRush.js';
import { buildMemoryDexRun } from '../src/game/memoryDex.js';
import { getTypeEffectiveness } from '../src/game/battle.js';
import { ARCADE_GAMES, getDailyArcadeGame, getQuickPlayGames } from '../src/game/arcadeGames.js';
import {
  buildArcadeResult,
  maxScoreForRounds,
  rewardCardsForResult,
} from '../src/game/arcadeScoring.js';
import {
  advanceDailyStreak,
  loadArcadeProgress,
  normalizeArcadeProgress,
  recordArcadeRun,
  utcDayKey,
} from '../src/store/arcadeProgress.js';

let failures = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

function seededRng(seed = 42) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

console.log('\n--- Arcade scoring and reward limits ---\n');
assert(maxScoreForRounds(8) === 1300, 'Eight perfect answers cap at 1300 points');
assert(rewardCardsForResult({ score: 0, maxScore: 1300 }) === 1, 'Low score still grants the minimum one card');
assert(rewardCardsForResult({ score: 780, maxScore: 1300 }) === 2, '60% score grants two cards');
assert(rewardCardsForResult({ score: 1170, maxScore: 1300 }) === 3, '90% score grants three cards');
assert(rewardCardsForResult({ score: 99999, maxScore: 1300 }) === 3, 'Reward count never exceeds three cards');

console.log('\n--- Arcade card rolls ---\n');
const uniqueRoll = rollArcadeCards([], pokemonList, 3);
assert(uniqueRoll.length === 3, 'Three-card reward rolls three cards');
assert(new Set(uniqueRoll.map((pokemon) => pokemon.id)).size === 3, 'Cards within one reward roll are unique');
assert(rollArcadeCards([], pokemonList, 9).length === 3, 'Requested card count is capped at three');

const almostMaxed = pokemonList
  .filter((pokemon) => Number(pokemon.id) !== 25)
  .map((pokemon) => ({ pokemon_id: pokemon.id, star_level: MAX_STAR_LEVEL }));
const maxedFiltered = rollArcadeCards(almostMaxed, pokemonList, 1);
assert(maxedFiltered[0]?.id === 25, 'Maxed cards are excluded while an eligible card remains');

console.log('\n--- Link Lab rounds ---\n');
const linkRun = buildLinkLabRun(8, seededRng(7));
assert(linkRun.rounds.length === 8, 'Link Lab builds eight rounds');
assert(linkRun.maxScore === 1300, 'Link Lab exposes the full score ceiling');
assert(linkRun.rounds.every((round) => round.options.length === 4), 'Every Link Lab round has four options');
assert(
  linkRun.rounds.every((round) => new Set(round.options.map((pokemon) => pokemon.id)).size === 4),
  'Link Lab options are unique within each round'
);
assert(
  linkRun.rounds.every((round) => round.options.some((pokemon) => pokemon.id === round.correctId)),
  'Every Link Lab round includes the correct missing link'
);
assert(
  linkRun.rounds.every((round) => round.targetIndex >= 1 && round.targetIndex < round.path.length),
  'Every missing link targets an evolution stage after the base form'
);

console.log('\n--- Type Weaver rounds ---\n');
const typeRun = buildTypeWeaverRun(8, seededRng(19));
assert(typeRun.rounds.length === 8, 'Type Weaver builds eight rounds');
assert(typeRun.rounds.every((round) => round.options.length === 4), 'Every Type Weaver round has four options');
assert(
  typeRun.rounds.every((round) => new Set(round.options.map((option) => option.type)).size === 4),
  'Type Weaver options are unique within each round'
);
assert(
  typeRun.rounds.every(
    (round) => getTypeEffectiveness(round.correctType, round.defender.types) === round.bestMultiplier
  ),
  'Every Type Weaver correct type matches the strongest multiplier'
);
assert(
  typeRun.rounds.every((round) => round.options.every((option) => option.multiplier <= round.bestMultiplier)),
  'Type Weaver never offers an option stronger than the answer'
);

console.log('\n--- Catch Rush rounds ---\n');
const catchRun = buildCatchRushRun(10, seededRng(31));
assert(catchRun.rounds.length === 10, 'Catch Rush builds ten rounds');
assert(catchRun.maxScore === 1700, 'Catch Rush exposes the full score ceiling');
assert(catchRun.rounds.every((round) => round.options.length === 9), 'Every Catch Rush round has nine field options');
assert(
  catchRun.rounds.every((round) => new Set(round.options.map((pokemon) => pokemon.id)).size === 9),
  'Catch Rush options are unique within each round'
);
assert(
  catchRun.rounds.every((round) => round.options.some((pokemon) => pokemon.id === round.target.id)),
  'Every Catch Rush target appears in the field'
);
assert(
  new Set(catchRun.rounds.map((round) => round.target.id)).size === 10,
  'Catch Rush targets are unique within a run'
);

console.log('\n--- Memory Dex board ---\n');
const memoryRun = buildMemoryDexRun(5, seededRng(43));
assert(memoryRun.pairs === 5 && memoryRun.cards.length === 10, 'Memory Dex builds ten cards for five pairs');
assert(memoryRun.maxScore === 700, 'Memory Dex exposes the full score ceiling');
assert(new Set(memoryRun.cards.map((card) => card.id)).size === 10, 'Memory Dex card instances are unique');
const pairCounts = new Map();
memoryRun.cards.forEach((card) => {
  pairCounts.set(card.pairId, (pairCounts.get(card.pairId) || 0) + 1);
});
assert(pairCounts.size === 5 && [...pairCounts.values()].every((count) => count === 2), 'Every Memory Dex pair has exactly two cards');

console.log('\n--- Daily rotation and streaks ---\n');
const rotationDates = [
  new Date('2026-10-25T12:00:00Z'),
  new Date('2026-10-26T12:00:00Z'),
  new Date('2026-10-27T12:00:00Z'),
  new Date('2026-10-28T12:00:00Z'),
];
const rotationIds = rotationDates.map((date) => getDailyArcadeGame(date).id);
assert(new Set(rotationIds).size === ARCADE_GAMES.length, 'Four consecutive days rotate through all four games');
assert(
  getDailyArcadeGame(rotationDates[0]).id === getDailyArcadeGame(new Date('2026-10-25T23:59:00Z')).id,
  'Daily featured stays stable within the same UTC day'
);
assert(ARCADE_GAMES.every((game) => game.playable), 'All four arcade cabinets are playable');
const quickPlay = getQuickPlayGames(rotationDates[0]);
assert(quickPlay.length === 3, 'Quick Play excludes the daily featured game');
assert(!quickPlay.some((game) => game.id === getDailyArcadeGame(rotationDates[0]).id), 'Quick Play never repeats the daily featured game');

let dailyStreak = advanceDailyStreak(null, new Date('2026-10-25T12:00:00Z'));
assert(dailyStreak.current === 1 && dailyStreak.best === 1, 'First run starts a one-day streak');
dailyStreak = advanceDailyStreak(dailyStreak, new Date('2026-10-25T20:00:00Z'));
assert(dailyStreak.current === 1 && dailyStreak.best === 1, 'Multiple runs on the same day do not double the streak');
dailyStreak = advanceDailyStreak(dailyStreak, new Date('2026-10-26T08:00:00Z'));
assert(dailyStreak.current === 2 && dailyStreak.best === 2, 'A run on the next UTC day extends the streak');
dailyStreak = advanceDailyStreak(dailyStreak, new Date('2026-10-28T08:00:00Z'));
assert(dailyStreak.current === 1 && dailyStreak.best === 2, 'A missed day resets the current streak and preserves the best');

const staleStreak = normalizeArcadeProgress(
  { streak: { current: 6, best: 8, lastDay: '2026-10-20' } },
  new Date('2026-10-25T12:00:00Z')
);
assert(staleStreak.streak.current === 0 && staleStreak.streak.best === 8, 'Stale daily streaks reset on load while best is preserved');
const liveStreak = normalizeArcadeProgress(
  { streak: { current: 3, best: 3, lastDay: '2026-10-24' } },
  new Date('2026-10-25T12:00:00Z')
);
assert(liveStreak.streak.current === 3, 'A streak from the previous UTC day stays live');

const clampedResult = buildArcadeResult({
  score: 99999,
  maxScore: 1300,
  correct: 99,
  rounds: 8,
  bestStreak: 99,
});
assert(clampedResult.score === 1300, 'Arcade results clamp score to the run ceiling');
assert(clampedResult.correct === 8, 'Arcade results clamp correct answers to completed rounds');
assert(clampedResult.bestStreak === 8, 'Arcade results clamp best streak to completed rounds');
assert(clampedResult.rewardCards === 3, 'Perfect runs cap rewards at three cards');

console.log('\n--- Arcade progress persistence ---\n');
const fixedDate = new Date('2026-10-25T12:00:00Z');
const stale = normalizeArcadeProgress(
  {
    games: { 'link-lab': { runs: 4, bestScore: 900 } },
    daily: { day: '2026-10-24', runs: 8, bestScore: 1200, rewardCards: 9 },
    totals: { runs: 12, rewardCards: 20 },
  },
  fixedDate
);
assert(stale.daily.day === utcDayKey(fixedDate), 'Daily state uses the current UTC day');
assert(stale.daily.runs === 0 && stale.daily.bestScore === 0, 'New UTC day resets daily run counters');
assert(stale.games['link-lab'].runs === 4 && stale.games['link-lab'].bestScore === 900, 'All-time game records survive daily reset');
assert(stale.totals.runs === 12 && stale.totals.rewardCards === 20, 'Lifetime totals survive daily reset');

const current = normalizeArcadeProgress(
  { daily: { day: utcDayKey(fixedDate), runs: 3, bestScore: 800, rewardCards: 4 } },
  fixedDate
);
assert(current.daily.runs === 3 && current.daily.bestScore === 800, 'Same-day daily state remains intact');

console.log('\n--- Arcade run recording ---\n');
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => (memoryStorage.has(key) ? memoryStorage.get(key) : null),
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};
const firstRunDay = new Date('2026-10-25T12:00:00Z');
const firstRunGame = getDailyArcadeGame(firstRunDay).id;
recordArcadeRun({
  userId: 'test-user',
  gameId: firstRunGame,
  score: 99999,
  maxScore: 1300,
  correct: 99,
  rounds: 8,
  bestStreak: 99,
  rewardCards: 9,
  date: firstRunDay,
});
recordArcadeRun({
  userId: 'test-user',
  gameId: firstRunGame,
  score: 400,
  maxScore: 1300,
  correct: 3,
  rounds: 8,
  bestStreak: 2,
  rewardCards: 1,
  date: new Date('2026-10-25T18:00:00Z'),
});
let recorded = loadArcadeProgress('test-user', firstRunDay);
assert(recorded.games[firstRunGame].bestScore === 1300, 'Recorded runs clamp the best score to the ceiling');
assert(recorded.games[firstRunGame].bestCorrect === 8, 'Recorded runs clamp correct answers to completed rounds');
assert(recorded.games[firstRunGame].bestStreak === 8, 'Recorded runs clamp best streak to completed rounds');
assert(recorded.daily.runs === 2 && recorded.daily.rewardCards === 4, 'Same-day daily runs accumulate rewards');
assert(recorded.streak.current === 1 && recorded.streak.best === 1, 'Same-day recorded runs keep one streak day');
assert(recorded.totals.runs === 2 && recorded.totals.rewardCards === 4, 'Recorded runs update lifetime totals');

const nextRunDay = new Date('2026-10-26T09:00:00Z');
recordArcadeRun({
  userId: 'test-user',
  gameId: getDailyArcadeGame(nextRunDay).id,
  score: 100,
  maxScore: 100,
  correct: 1,
  rounds: 1,
  bestStreak: 1,
  rewardCards: 1,
  date: nextRunDay,
});
recorded = loadArcadeProgress('test-user', nextRunDay);
assert(recorded.streak.current === 2 && recorded.streak.best === 2, 'A recorded next-day run extends the daily streak');
assert(recorded.daily.runs === 1, 'Daily counters reset when the featured game rotates');

if (failures > 0) {
  console.error(`\n${failures} arcade core test(s) failed.`);
  process.exit(1);
}

console.log('\nAll arcade core tests passed.');

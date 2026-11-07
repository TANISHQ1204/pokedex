/**
 * Collection duplicate-merge + tiered Pokédex progress invariants.
 *
 * Run: node scripts/test_collection_progression.js
 */
import { mergeCollectionRecords, isNormalRecord } from '../src/utils/cardTypes.js';
import { computeDexTierProgress } from '../src/game/dexProgress.js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';

let failures = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

console.log('\n--- Test A: duplicate normal rows recover star progress ---\n');

const duplicateRows = [
  { id: 1, pokemon_id: 25, star_level: 2, dupes_collected: 1, is_shiny: false },
  { id: 2, pokemon_id: 25, star_level: 2, dupes_collected: 1, is_shiny: true },
  { id: 3, pokemon_id: 25, star_level: 2, dupes_collected: 1, is_shiny: false },
  { id: 4, pokemon_id: 25, star_level: 1, dupes_collected: 0, is_shiny: false, is_power_card: true },
  { id: 5, pokemon_id: 25, star_level: 1, dupes_collected: 0, is_shiny: false, is_ancient_card: true },
];

const merged = mergeCollectionRecords(duplicateRows);
const normal = merged.find(isNormalRecord);
const power = merged.find((row) => row.is_power_card);
const ancient = merged.find((row) => row.is_ancient_card);

assert(merged.length === 3, 'One normal, one power, and one ancient row remain');
assert(normal?.star_level === 3, 'Three duplicate rows recover a 3★ normal card');
assert(normal?.dupes_collected === 2, 'Recovered duplicate count matches star level');
assert(normal?.is_shiny === true, 'Shiny is preserved from any duplicate row');
assert(power?.id === 4, 'Power row is not merged into the normal card');
assert(ancient?.id === 5, 'Ancient row is not merged into the normal card');

console.log('\n--- Test B: a higher stored star is never downgraded ---\n');

const highStar = mergeCollectionRecords([
  { id: 10, pokemon_id: 6, star_level: 10, dupes_collected: 9, is_shiny: false },
]);
assert(highStar[0]?.star_level === 10, 'A single 10★ row stays 10★');
assert(highStar[0]?.dupes_collected === 9, 'Existing duplicate count is preserved');

console.log('\n--- Test C: Pokédex tracker advances through star tiers ---\n');

const entries = [{ id: 1 }, { id: 2 }, { id: 3 }];

let progress = computeDexTierProgress(new Map(), entries);
assert(progress.tier === 1 && progress.percent === 0, 'Empty dex tracks the base tier at 0%');

let map = new Map([
  [1, { star_level: 1 }],
  [2, { star_level: 1 }],
  [3, { star_level: 1 }],
]);
progress = computeDexTierProgress(map, entries);
assert(progress.tier === 2 && progress.achieved === 0, 'Full base collection advances to tier 2');

map = new Map([
  [1, { star_level: 2 }],
  [2, { star_level: 1 }],
  [3, { star_level: 1 }],
]);
progress = computeDexTierProgress(map, entries);
assert(progress.tier === 2 && progress.achieved === 1 && progress.percent === 33, 'Tier 2 counts upgraded cards');
assert(progress.remaining === 2, 'Tier 2 reports the cards still to upgrade');

map = new Map([
  [1, { star_level: 2 }],
  [2, { star_level: 2 }],
  [3, { star_level: 2 }],
]);
progress = computeDexTierProgress(map, entries);
assert(progress.tier === 3 && progress.achieved === 0, 'Completing tier 2 advances to tier 3');

map = new Map(entries.map((entry) => [entry.id, { star_level: MAX_STAR_LEVEL }]));
progress = computeDexTierProgress(map, entries);
assert(progress.tier === MAX_STAR_LEVEL, 'All cards at 20★ reach the final tier');
assert(progress.isMaxed && progress.percent === 100, 'Final tier reports Shiny Master completion');

if (failures === 0) {
  console.log('\nALL COLLECTION PROGRESSION TESTS PASSED');
} else {
  console.error(`\n${failures} COLLECTION PROGRESSION TEST(S) FAILED`);
  process.exit(1);
}

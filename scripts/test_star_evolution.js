/**
 * Star evolution + migration invariants for the 20-star card system.
 *
 * Run: node scripts/test_star_evolution.js
 */
import {
  MAX_STAR_LEVEL,
  SHINY_STAR_LEVEL,
  starLevelFromDupes,
} from '../src/game/cardLevels.js';
import { migrateNormalCardRow } from '../src/game/starMigration.js';

let failures = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

function evolve(existingStar, existingDupes, existingShiny = false) {
  if (existingStar >= MAX_STAR_LEVEL) {
    return {
      newDupes: existingDupes,
      newStarLevel: MAX_STAR_LEVEL,
      starUpgraded: false,
      becameShiny: false,
      maxedOut: true,
    };
  }

  const newDupes = Math.min(MAX_STAR_LEVEL - 1, existingDupes + 1);
  const newStarLevel = starLevelFromDupes(newDupes, existingStar);
  return {
    newDupes,
    newStarLevel,
    starUpgraded: newStarLevel > existingStar,
    becameShiny: !existingShiny && newStarLevel >= SHINY_STAR_LEVEL,
    maxedOut: false,
  };
}

console.log('\n--- Test A: 1 duplicate = 1 star, 19 duplicates = 20 stars ---\n');
let dupes = 0;
let star = 1;
const steps = [];
for (let i = 0; i < 19; i += 1) {
  const result = evolve(star, dupes);
  dupes = result.newDupes;
  star = result.newStarLevel;
  steps.push({ dupes, star, upgraded: result.starUpgraded });
}
assert(steps[0].star === 2 && steps[0].upgraded, 'First duplicate upgrades 1★ to 2★');
assert(steps[18].star === MAX_STAR_LEVEL, '19th duplicate reaches 20★');
assert(steps.every((step, idx) => step.star === idx + 2), 'Every duplicate adds exactly one star');

const blocked = evolve(MAX_STAR_LEVEL, 19);
assert(blocked.maxedOut && blocked.newStarLevel === MAX_STAR_LEVEL, 'Maxed cards block further upgrades');

console.log('\n--- Test B: legacy rows are never downgraded ---\n');
assert(starLevelFromDupes(4, 5) === 5, 'Legacy 5★ with 4 dupes stays 5★');
const nextLegacy = evolve(5, 4);
assert(nextLegacy.newStarLevel === 6, 'Legacy 5★ upgrades to 6★ on its next duplicate');
assert(starLevelFromDupes(18, 19) === 19, 'Stored 19★ is preserved with 18 dupes');

console.log('\n--- Test C: shiny unlocks exactly at 20★ ---\n');
const at19 = evolve(18, 17);
assert(!at19.becameShiny && at19.newStarLevel === 19, '19★ is not shiny yet');
const at20 = evolve(19, 18);
assert(at20.becameShiny && at20.newStarLevel === SHINY_STAR_LEVEL, '20★ unlocks shiny');

console.log('\n--- Test D: migration preserves legacy progress ---\n');
const legacyMax = migrateNormalCardRow(
  {
    id: 1,
    user_id: 'u1',
    pokemon_id: 25,
    star_level: 10,
    dupes_collected: 18,
    is_shiny: true,
  },
  '2026-01-01T00:00:00.000Z'
);
assert(legacyMax?.star_level === 20, 'Legacy maxed 10★ becomes 20★');
assert(legacyMax?.dupes_collected === 19, 'Legacy maxed card gets 19 dupes');
assert(legacyMax?.is_shiny === true, 'Legacy shiny is preserved');

const legacyFive = migrateNormalCardRow({
  id: 2,
  user_id: 'u1',
  pokemon_id: 6,
  star_level: 5,
  dupes_collected: 4,
  is_shiny: false,
});
assert(legacyFive === null, 'Legacy 5★ with matching dupes requires no downgrade write');

const alreadyCurrent = migrateNormalCardRow({
  id: 3,
  user_id: 'u1',
  pokemon_id: 7,
  star_level: 9,
  dupes_collected: 8,
  is_shiny: false,
});
assert(alreadyCurrent === null, 'Already-valid rows are not rewritten on a second pass');

const special = migrateNormalCardRow({
  id: 4,
  star_level: 10,
  dupes_collected: 18,
  is_power_card: true,
});
assert(special === null, 'Power Cards are untouched');

console.log('\n--- Test E: migration is idempotent ---\n');
const currentTen = migrateNormalCardRow({
  id: 5,
  user_id: 'u1',
  pokemon_id: 150,
  star_level: 10,
  dupes_collected: 9,
  is_shiny: false,
});
assert(currentTen === null, 'A current 10★ card stays at 10★');

const migrated = migrateNormalCardRow({
  id: 6,
  user_id: 'u1',
  pokemon_id: 151,
  star_level: 8,
  dupes_collected: 3,
  is_shiny: false,
});
assert(migrated?.dupes_collected === 7, 'Migration raises duplicate count to match star level');
const secondPass = migrateNormalCardRow(migrated);
assert(secondPass === null, 'Second migration pass makes no changes');

if (failures === 0) {
  console.log('\nALL 20-STAR EVOLUTION AND MIGRATION TESTS PASSED');
} else {
  console.error(`\n${failures} TEST(S) FAILED`);
  process.exit(1);
}

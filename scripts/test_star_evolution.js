/**
 * Star evolution + never-downgrade invariant (mirrors awardCard Case C in
 * src/store/collection.js).
 *
 * Run: node scripts/test_star_evolution.js
 *
 * Verifies:
 *   1. New-card evolution: dupes 0-1 → 1★, 2-3 → 2★ ... 18 → 10★ (maxed).
 *   2. Existing 5★ pre-migration rows are NEVER downgraded by the new formula.
 *   3. Shiny unlocks exactly at SHINY_STAR_LEVEL (10★).
 *   4. Maxed rows stay maxed on further dupes.
 */
import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL } from '../src/game/cardLevels.js';

let failures = 0;

function assert(cond, label) {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    failures += 1;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

/** Exactly mirrors awardCard's Case C star computation. */
function evolve(existingStar, existingDupes) {
  const newDupes = (existingDupes || 0) + 1;
  const formulaStar = Math.min(MAX_STAR_LEVEL, 1 + Math.floor(newDupes / 2));
  const newStarLevel = Math.max(Number(existingStar) || 1, formulaStar);
  const starUpgraded = newStarLevel > existingStar;
  return { newDupes, newStarLevel, starUpgraded, becameShiny: newStarLevel >= SHINY_STAR_LEVEL };
}

console.log('\n--- Test A: fresh card evolves toward 10★ (1★ @1 dupe -> 10★ @18 dupes) ---\n');
const freshSteps = [];
let dupes = 0;
let star = 1;
while (dupes < 20) {
  dupes += 1;
  const r = evolve(star, dupes - 1);
  star = r.newStarLevel;
  freshSteps.push([dupes, star]);
}
assert(freshSteps[0][1] === 1, `1st dupe stays 1★ (got ${freshSteps[0][1]}★)`);
assert(freshSteps[1][1] === 2, `2nd dupe -> 2★ (got ${freshSteps[1][1]}★)`);
assert(freshSteps[17][0] === 18 && freshSteps[17][1] === MAX_STAR_LEVEL, `18th dupe -> ${MAX_STAR_LEVEL}★ (got ${freshSteps[17][1]}★)`);
assert(freshSteps[19][1] === MAX_STAR_LEVEL, `20th dupe stays capped at ${MAX_STAR_LEVEL}★ (got ${freshSteps[19][1]}★)`);

console.log('\n--- Test B: pre-migration 5★ row is never downgraded ---\n');
// Old system: 5★ @ 4 dupes. New formula at 4->5 dupes computes 1+floor(5/2)=3★.
const premig = evolve(5, 4);
assert(premig.newStarLevel === 5, `5★ row with dupe #5 stays 5★ (got ${premig.newStarLevel}★)`);
assert(premig.newDupes === 5, `dupes still accumulate (5) after a carryover drop`);
// It only upgrades once the formula surpasses stored star (dupes reaching >= 10).
const premig8 = evolve(5, 9);
assert(premig8.newStarLevel === 6, `5★ row upgrades to 6★ once formula overtakes (got ${premig8.newStarLevel}★)`);

console.log('\n--- Test C: shiny unlocks exactly at 10★ ---\n');
const at9 = evolve(8, 15);
assert(!at9.becameShiny && at9.newStarLevel === 9, `9★ is not shiny yet (got ${at9.newStarLevel}★)`);
const at10 = evolve(9, 17);
assert(at10.becameShiny && at10.newStarLevel === SHINY_STAR_LEVEL, `10★ unlocks shiny (got ${at10.newStarLevel}★)`);

console.log('\n--- Test D: maxed rows are skipped (awardCard Case B) ---\n');
// Guard in collection.js blocks any award at star_level >= MAX_STAR_LEVEL, so the
// normal path never recomputes these — assert the formula can't push past cap anyway.
const maxed = evolve(MAX_STAR_LEVEL, 10);
assert(maxed.newStarLevel === MAX_STAR_LEVEL, `Formula never exceeds ${MAX_STAR_LEVEL}★ (got ${maxed.newStarLevel}★)`);

if (failures === 0) {
  console.log('\n✅ ALL STAR EVOLUTION TESTS PASSED — no downgrade, cap respected, shiny at 10★.');
} else {
  console.error(`\n❌ ${failures} STAR EVOLUTION TEST(S) FAILED.`);
  process.exit(1);
}
/**
 * PART 1 VERIFICATION — Card Type Drop Independence.
 *
 * Run: node scripts/test_card_independence.js
 *
 * Verifies the drop-eligibility + award-row rules for ALL THREE card types:
 *   - owning a Pokemon's NORMAL card (any star level, incl. maxed/shiny) has
 *     NO effect on that Pokemon's Power or Ancient card eligibility;
 *   - owning a Pokemon's POWER card has NO effect on its normal (drop/level-up)
 *     or Ancient eligibility;
 *   - owning a Pokemon's ANCIENT card has NO effect on the other two.
 *
 * Strategy: one Pokemon (#25) is made the SOLE eligible target of a given card
 * type, so the chosen drop is deterministic regardless of the internal random
 * pick. Math.random is stubbed so the desired type's roll always wins/loses.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rollBattleDrop } from '../src/game/drops.js';
import {
  isPowerRecord,
  isAncientRecord,
  isNormalRecord,
  findNormalRecord,
  findPowerRecord,
  findAncientRecord,
} from '../src/utils/cardTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pokemonList = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/pokemon.json'), 'utf-8'));

let failures = 0;

function assert(cond, label) {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    failures += 1;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

/** Forces Math.random to return the given sequence (defaults to 0.5), then restores. */
function withRandom(queue, fn) {
  const original = Math.random;
  let i = 0;
  Math.random = () => (i < queue.length ? queue[i++] : 0.5);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function rollIt(userCollection, randomQueue) {
  return withRandom(randomQueue, () => rollBattleDrop(userCollection, pokemonList));
}

const normalRecord = (id, { star = 5, shiny = false } = {}) => ({
  pokemon_id: id,
  star_level: star,
  dupes_collected: 0,
  is_shiny: shiny,
  is_power_card: false,
  is_ancient_card: false,
});
const powerRecord = (id) => ({ pokemon_id: id, star_level: 1, dupes_collected: 0, is_shiny: false, is_power_card: true });
const ancientRecord = (id) => ({ pokemon_id: id, star_level: 1, dupes_collected: 0, is_shiny: false, is_ancient_card: true });

const N = 25; // target Pokemon under test
const OTHERS = pokemonList.map((p) => Number(p.id)).filter((id) => id !== N);

console.log('\n--- Test A: NORMAL (maxed + shiny) owned does NOT block Power/Ancient for #25 ---\n');

// #25 owns a maxed+shiny normal card. Everyone else ALSO has a power card, so
// #25 is the ONLY power-eligible Pokemon. It must still receive the Power Card.
let coll = [
  normalRecord(N, { star: 5, shiny: true }),
  ...OTHERS.map(normalRecord),                    // every other Pokemon has maxed normal
  ...OTHERS.map(powerRecord),                     // ...and an owned Power Card (only #25 power-free)
];
let drop = rollIt(coll, [0.01, 0.99]); // power roll wins, ancient roll loses
assert(drop.type === 'power', `Power Card drops for #25 while its normal card is owned (got ${drop.type})`);
assert(Number(drop.pokemon.id) === N, `Power drop is #25 (got #${drop.pokemon.id})`);

// #25 owns a maxed+shiny normal card. Everyone else ALSO has an ancient card, so
// #25 is the ONLY ancient-eligible Pokemon.
coll = [
  normalRecord(N, { star: 5, shiny: true }),
  ...OTHERS.map(normalRecord),
  ...OTHERS.map(ancientRecord),
];
drop = rollIt(coll, [0.99, 0.01]); // power roll loses, ancient roll wins
assert(drop.type === 'ancient', `Ancient Card drops for #25 while its normal card is owned (got ${drop.type})`);
assert(Number(drop.pokemon.id) === N, `Ancient drop is #25 (got #${drop.pokemon.id})`);

console.log('\n--- Test B: POWER owned does NOT block Normal or Ancient for #25 ---\n');

// #25 owns a Power Card; everyone else has a maxed normal card. #25 is the ONLY
// normal-eligible Pokemon (its normal card is unowned), so it must still drop/level-up.
coll = [
  powerRecord(N),
  ...OTHERS.map(normalRecord),
];
drop = rollIt(coll, [0.99, 0.99]); // neither special roll wins -> normal drop
assert(drop.type === 'normal', `Normal card can still drop/level-up when Power Card is owned (got ${drop.type})`);
assert(Number(drop.pokemon.id) === N, `Normal drop is #25 (got #${drop.pokemon.id})`);

// #25 owns a Power Card; everyone else has an ancient card owned, so #25 is the
// ONLY ancient-eligible Pokemon (its ancient is unowned).
coll = [powerRecord(N), ...OTHERS.map(ancientRecord)];
drop = rollIt(coll, [0.99, 0.01]); // power roll loses, ancient roll wins
assert(drop.type === 'ancient', `Ancient Card still drops when Power Card is owned (got ${drop.type})`);
assert(Number(drop.pokemon.id) === N, `Ancient drop is #25 even though its Power card is owned (got #${drop.pokemon.id})`);

console.log('\n--- Test C: ANCIENT owned does NOT block Normal or Power for #25 ---\n');

// #25 owns an Ancient Card; everyone else has a maxed normal card. #25 is the ONLY
// normal-eligible Pokemon, so its normal card must still drop.
coll = [ancientRecord(N), ...OTHERS.map(normalRecord)];
drop = rollIt(coll, [0.99, 0.99]); // neither special roll wins -> normal drop
assert(drop.type === 'normal', `Normal card can still drop when Ancient Card is owned (got ${drop.type})`);
assert(Number(drop.pokemon.id) === N, `Normal drop is #25 (got #${drop.pokemon.id})`);

// #25 owns an Ancient Card; everyone else has a power card owned, so #25 is the
// ONLY power-eligible Pokemon.
coll = [ancientRecord(N), ...OTHERS.map(powerRecord)];
drop = rollIt(coll, [0.01, 0.99]); // power roll wins, ancient roll loses
assert(drop.type === 'power', `Power Card still drops when Ancient Card is owned (got ${drop.type})`);
assert(Number(drop.pokemon.id) === N, `Power drop is #25 even though its Ancient card is owned (got #${drop.pokemon.id})`);

console.log('\n--- Test D: both Power + Ancient owned do NOT block a NEW Normal card row ---\n');

// Row selection used by awardCard: a user who owns ONLY special-card records for
// #25 must be treated as NOT owning the normal card (new row inserted).
const rowsWithOnlySpecial = [powerRecord(N), ancientRecord(N)];
assert(findNormalRecord(rowsWithOnlySpecial) === null, 'No normal row found when only Power+Ancient rows exist (new normal row will be inserted)');
assert(isPowerRecord(rowsWithOnlySpecial[0]), 'Eligibility treats a Power Card row as power-owned only');
assert(isAncientRecord(rowsWithOnlySpecial[1]), 'Eligibility treats an Ancient Card row as ancient-owned only');
assert(!isNormalRecord(rowsWithOnlySpecial[0]), 'A Power Card row is never treated as a normal card');
assert(!isNormalRecord(rowsWithOnlySpecial[1]), 'An Ancient Card row is never treated as a normal card');

// With real normal + special rows present, each finder returns exactly its own type.
const mixedRows = [
  normalRecord(N, { star: 4 }),
  powerRecord(N),
  ancientRecord(N),
];
const normalRow = findNormalRecord(mixedRows);
const powerRow = findPowerRecord(mixedRows);
const ancientRow = findAncientRecord(mixedRows);
assert(normalRow && isNormalRecord(normalRow), 'Normal finder returns only the normal row');
assert(powerRow && isPowerRecord(powerRow), 'Power finder returns only the Power row');
assert(ancientRow && isAncientRecord(ancientRow), 'Ancient finder returns only the Ancient row');

console.log('\n--- Test E: maxed special rows can NOT corrupt/block the normal card ---\n');

// Defense-in-depth: even if a special row ever held star_level >= 5, the normal
// award path must not treat it as a maxed normal card.
const specialHighStar = [{ pokemon_id: N, star_level: 5, dupes_collected: 40, is_shiny: true, is_ancient_card: true }];
assert(findNormalRecord(specialHighStar) === null, 'A maxed Ancient row does not masquerade as a maxed normal card');
assert(!isNormalRecord(specialHighStar[0]), 'Maxed Ancient rows are excluded from normal-card progress/eligibility');

console.log('\n--- Test F: normal-collection progress ignores Power/Ancient records ---\n');

const specialOnly = [powerRecord(1), ancientRecord(2)];
assert(specialOnly.every((r) => !isNormalRecord(r)), 'Special-only collection yields zero normal-owned Pokemon');

if (failures === 0) {
  console.log('\n✅ ALL CARD INDEPENDENCE TESTS PASSED — all three card types are fully independent per Pokemon.');
} else {
  console.error(`\n❌ ${failures} INDEPENDENCE TEST(S) FAILED.`);
  process.exit(1);
}
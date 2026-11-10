/**
 * 3-card arcade reward guarantee invariants.
 *
 * Run: node scripts/test_arcade_guarantee.js
 */
import { rollArcadeCards } from '../src/game/drops.js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';
import { fullPokemonList } from '../src/utils/pokemonCatalog.js';

let failures = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

function collectionFrom(ownedMap) {
  return [...ownedMap.entries()].map(([id, r]) => ({ pokemon_id: id, ...r }));
}

const list = fullPokemonList;
const listIds = list.map((pokemon) => Number(pokemon.id));

console.log('\n--- Pull size and uniqueness ---\n');

for (const count of [1, 2, 3]) {
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const cards = rollArcadeCards([], list, count);
    if (cards.length !== count) ok = false;
    if (new Set(cards.map((card) => Number(card.id))).size !== count) ok = false;
  }
  assert(ok, `${count}-card pulls always return exactly ${count} unique cards`);
}

const small = list.slice(0, 2);
const smallPull = rollArcadeCards([], small, 3);
assert(
  smallPull.length === 2 && new Set(smallPull.map((card) => Number(card.id))).size === 2,
  'A pool smaller than the pull size returns every card without throwing'
);

console.log('\n--- Undiscovered-card guarantee ---\n');

const partial = new Map();
list.forEach((pokemon, index) => {
  const id = Number(pokemon.id);
  if (index % 2 === 0) partial.set(id, { star_level: 1 + (index % 5), dupes_collected: 0 });
});

let guaranteeOk = true;
let sizeOk = true;
for (let i = 0; i < 200; i++) {
  const cards = rollArcadeCards(collectionFrom(partial), list, 3);
  if (cards.length !== 3 || new Set(cards.map((card) => Number(card.id))).size !== 3) sizeOk = false;
  if (!cards.some((card) => !partial.has(Number(card.id)))) guaranteeOk = false;
}
assert(sizeOk, '3-card pulls with a partial collection still return 3 unique cards');
assert(guaranteeOk, 'Every 3-card pull includes at least one undiscovered card while any remain');

console.log('\n--- Lowest-tier guarantee (fully discovered) ---\n');

const discovered = new Map();
list.forEach((pokemon, index) => {
  const id = Number(pokemon.id);
  if (index % 4 === 0) discovered.set(id, { star_level: MAX_STAR_LEVEL, dupes_collected: MAX_STAR_LEVEL - 1 });
  else discovered.set(id, { star_level: 2 + (index % 3), dupes_collected: 1 });
});

let lowestOk = true;
let maxedOk = true;
sizeOk = true;
for (let i = 0; i < 200; i++) {
  const cards = rollArcadeCards(collectionFrom(discovered), list, 3);
  if (cards.length !== 3 || new Set(cards.map((card) => Number(card.id))).size !== 3) sizeOk = false;
  if (!cards.some((card) => discovered.get(Number(card.id))?.star_level === 2)) lowestOk = false;
  if (cards.some((card) => discovered.get(Number(card.id))?.star_level >= MAX_STAR_LEVEL)) maxedOk = false;
}
assert(sizeOk, '3-card pulls with a fully discovered collection still return 3 unique cards');
assert(lowestOk, 'Every 3-card pull includes one card from the lowest non-maxed star tier');
assert(maxedOk, 'Maxed cards are never part of a pull while non-maxed cards remain');

console.log('\n--- Maxed fallback ---\n');

const almostMaxed = new Map(discovered);
listIds.forEach((id, index) => {
  if (index < listIds.length - 2) {
    almostMaxed.set(id, { star_level: MAX_STAR_LEVEL, dupes_collected: MAX_STAR_LEVEL - 1 });
  }
});
const almostMaxedPull = rollArcadeCards(collectionFrom(almostMaxed), list, 3);
assert(
  almostMaxedPull.length === 3 && new Set(almostMaxedPull.map((card) => Number(card.id))).size === 3,
  'A nearly maxed collection still returns 3 unique cards via the full-list fallback'
);

const maxedCollection = list.map((pokemon) => ({
  pokemon_id: Number(pokemon.id),
  star_level: MAX_STAR_LEVEL,
  dupes_collected: MAX_STAR_LEVEL - 1,
}));
let allMaxedOk = true;
for (let i = 0; i < 100; i++) {
  const cards = rollArcadeCards(maxedCollection, list, 3);
  if (cards.length !== 3 || new Set(cards.map((card) => Number(card.id))).size !== 3) allMaxedOk = false;
}
assert(allMaxedOk, 'A fully maxed collection still returns 3 unique cards');

console.log('\n--- Special rows stay independent ---\n');

const specialOnly = [
  { pokemon_id: 1, star_level: MAX_STAR_LEVEL, is_power_card: true },
  { pokemon_id: 2, star_level: MAX_STAR_LEVEL, is_ancient_card: true },
];
let specialOk = true;
for (let i = 0; i < 100; i++) {
  const cards = rollArcadeCards(specialOnly, list, 3);
  if (cards.length !== 3 || new Set(cards.map((card) => Number(card.id))).size !== 3) specialOk = false;
}
assert(specialOk, 'Power/Ancient-only rows never break or shrink the arcade pull');

if (failures > 0) {
  console.error(`\n${failures} arcade guarantee test(s) failed.`);
  process.exit(1);
}

console.log('\nAll arcade guarantee tests passed.');

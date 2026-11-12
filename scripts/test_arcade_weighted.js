/**
 * Weighted arcade reward invariants.
 *
 * Run: node scripts/test_arcade_weighted.js
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

function seededRng(seed = 42) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
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
    const cards = rollArcadeCards([], list, count, seededRng(i + 1));
    if (cards.length !== count) ok = false;
    if (new Set(cards.map((card) => Number(card.id))).size !== count) ok = false;
  }
  assert(ok, `${count}-card pulls always return exactly ${count} unique cards`);
}

const small = list.slice(0, 2);
const smallPull = rollArcadeCards([], small, 3, seededRng(7));
assert(
  smallPull.length === 2 && new Set(smallPull.map((card) => Number(card.id))).size === 2,
  'A pool smaller than the pull size returns every card without throwing'
);

console.log('\n--- Weighted lowest-tier odds ---\n');

const tierList = [
  { id: 1, name: 'low' },
  { id: 2, name: 'mid' },
  { id: 3, name: 'high' },
];
const tierCollection = [
  { pokemon_id: 1, star_level: 1, dupes_collected: 0 },
  { pokemon_id: 2, star_level: 10, dupes_collected: 9 },
  { pokemon_id: 3, star_level: 19, dupes_collected: 18 },
];
const tierCounts = { 1: 0, 2: 0, 3: 0 };
const tierRng = seededRng(99);
for (let i = 0; i < 5000; i++) {
  const [card] = rollArcadeCards(tierCollection, tierList, 1, tierRng);
  tierCounts[Number(card.id)] += 1;
}
assert(
  tierCounts[1] > tierCounts[2] && tierCounts[2] > tierCounts[3],
  'Lower-star cards are pulled more often than higher-star cards'
);
assert(
  tierCounts[1] > tierCounts[3] * 3,
  'The lowest tier is significantly more likely than a near-maxed card'
);

const newList = [
  { id: 1, name: 'new' },
  { id: 2, name: 'one-star' },
  { id: 3, name: 'nineteen-star' },
];
const newCollection = [
  { pokemon_id: 2, star_level: 1, dupes_collected: 0 },
  { pokemon_id: 3, star_level: 19, dupes_collected: 18 },
];
const newCounts = { 1: 0, 2: 0, 3: 0 };
const newRng = seededRng(123);
for (let i = 0; i < 5000; i++) {
  const [card] = rollArcadeCards(newCollection, newList, 1, newRng);
  newCounts[Number(card.id)] += 1;
}
assert(
  newCounts[1] > newCounts[2] && newCounts[2] > newCounts[3],
  'Undiscovered cards outweigh owned low-star and high-star cards'
);

const partial = new Map();
list.forEach((pokemon, index) => {
  const id = Number(pokemon.id);
  if (index % 2 === 0) partial.set(id, { star_level: 1 + (index % 5), dupes_collected: 0 });
});
let sawPullWithoutNew = false;
for (let i = 0; i < 500; i++) {
  const cards = rollArcadeCards(collectionFrom(partial), list, 3, seededRng(i + 1));
  if (!cards.some((card) => !partial.has(Number(card.id)))) sawPullWithoutNew = true;
}
assert(
  sawPullWithoutNew,
  'Undiscovered cards are weighted but no longer guaranteed in every 3-card pull'
);

console.log('\n--- Maxed fallback ---\n');

const almostMaxed = new Map();
listIds.forEach((id, index) => {
  if (index < listIds.length - 2) {
    almostMaxed.set(id, { star_level: MAX_STAR_LEVEL, dupes_collected: MAX_STAR_LEVEL - 1 });
  }
});
const almostMaxedPull = rollArcadeCards(collectionFrom(almostMaxed), list, 3, seededRng(5));
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
  const cards = rollArcadeCards(maxedCollection, list, 3, seededRng(i + 1));
  if (cards.length !== 3 || new Set(cards.map((card) => Number(card.id))).size !== 3) allMaxedOk = false;
}
assert(allMaxedOk, 'A fully maxed collection still returns 3 unique cards');

const oneEligible = list.filter((pokemon) => Number(pokemon.id) !== 25);
const oneEligibleCollection = oneEligible.map((pokemon) => ({
  pokemon_id: Number(pokemon.id),
  star_level: MAX_STAR_LEVEL,
  dupes_collected: MAX_STAR_LEVEL - 1,
}));
const onlyEligible = rollArcadeCards(oneEligibleCollection, list, 1, seededRng(3));
assert(onlyEligible[0]?.id === 25, 'Maxed cards are excluded while an eligible card remains');

console.log('\n--- Special rows stay independent ---\n');

const specialOnly = [
  { pokemon_id: 1, star_level: MAX_STAR_LEVEL, is_power_card: true },
  { pokemon_id: 2, star_level: MAX_STAR_LEVEL, is_ancient_card: true },
];
let specialOk = true;
for (let i = 0; i < 100; i++) {
  const cards = rollArcadeCards(specialOnly, list, 3, seededRng(i + 1));
  if (cards.length !== 3 || new Set(cards.map((card) => Number(card.id))).size !== 3) specialOk = false;
}
assert(specialOk, 'Power/Ancient-only rows never break or shrink the arcade pull');

if (failures > 0) {
  console.error(`\n${failures} arcade weighted test(s) failed.`);
  process.exit(1);
}

console.log('\nAll arcade weighted tests passed.');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBadgeStatus } from '../src/game/badges.js';
import { getTrophyTier } from '../src/game/trophies.js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readData(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${name}`), 'utf-8'));
}

const collections = readData('loreCollections.json');
const badges = readData('loreBadges.json');
const pokemon = readData('pokemon.json');
const pokemonIds = new Set(pokemon.map((entry) => Number(entry.id)));

let failures = 0;
function check(condition, label, quiet = false) {
  if (condition) {
    if (!quiet) console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

console.log('--- Testing Lore Awards Data + Logic ---');
console.log('Lore collections:', collections.length);
console.log('Lore badges:', badges.length);

const collectionIds = new Set();
collections.forEach((collection) => {
  check(!collectionIds.has(collection.id), `Unique collection id: ${collection.id}`, true);
  collectionIds.add(collection.id);
  check(Boolean(collection.name), `Collection has a name: ${collection.id}`, true);
  check(Boolean(collection.category), `Collection has a category: ${collection.id}`, true);
  check(collection.pokemonIds.length > 0, `Collection has a roster: ${collection.id}`, true);
  check(
    collection.pokemonIds.every((id) => pokemonIds.has(Number(id))),
    `Collection references valid Pokemon: ${collection.id}`,
    true
  );
});
check(collectionIds.size === collections.length, `All ${collections.length} collection ids are unique`);

const badgeIds = new Set();
badges.forEach((badge) => {
  check(!badgeIds.has(badge.id), `Unique badge id: ${badge.id}`, true);
  badgeIds.add(badge.id);
  check(Boolean(badge.name), `Badge has a name: ${badge.id}`, true);
  check(Boolean(badge.family), `Badge has a family: ${badge.id}`, true);
  check(Boolean(badge.design), `Badge has an emblem design: ${badge.id}`, true);
  check(
    badge.pokemonIds.every((id) => pokemonIds.has(Number(id))),
    `Badge references valid Pokemon: ${badge.id}`,
    true
  );
});
check(badgeIds.size === badges.length, `All ${badges.length} badge ids are unique`);

const ownedMilestone = badges.find((badge) => badge.criteria === 'ownedCount');
const shinyMilestone = badges.find((badge) => badge.criteria === 'shinyCount');
const maxedMilestone = badges.find((badge) => badge.criteria === 'maxedCount');

check(Boolean(ownedMilestone && shinyMilestone && maxedMilestone), 'All milestone criteria are represented');

const belowOwned = Array.from({ length: ownedMilestone.threshold - 1 }, (_, index) => ({
  pokemon_id: index + 1,
  star_level: 1,
}));
const atOwned = Array.from({ length: ownedMilestone.threshold }, (_, index) => ({
  pokemon_id: index + 1,
  star_level: 1,
}));
check(!getBadgeStatus(ownedMilestone, belowOwned).isUnlocked, 'Owned-count milestone stays locked below threshold');
check(getBadgeStatus(ownedMilestone, atOwned).isUnlocked, 'Owned-count milestone unlocks at threshold');

const shinyCards = Array.from({ length: shinyMilestone.threshold }, (_, index) => ({
  pokemon_id: index + 1,
  star_level: MAX_STAR_LEVEL,
  is_shiny: true,
}));
check(getBadgeStatus(shinyMilestone, shinyCards).isUnlocked, 'Shiny milestone unlocks at threshold');

const maxedCards = Array.from({ length: maxedMilestone.threshold }, (_, index) => ({
  pokemon_id: index + 1,
  star_level: MAX_STAR_LEVEL,
}));
check(getBadgeStatus(maxedMilestone, maxedCards).isUnlocked, 'Max-star milestone unlocks at threshold');

const powerCards = Array.from({ length: maxedMilestone.threshold }, (_, index) => ({
  pokemon_id: index + 1,
  star_level: MAX_STAR_LEVEL,
  is_power_card: true,
}));
check(!getBadgeStatus(maxedMilestone, powerCards).isUnlocked, 'Power cards never advance milestones');

const sampleCollection = collections[0];
const ownedSample = sampleCollection.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
check(
  getTrophyTier(sampleCollection, ownedSample).tier === 'bronze',
  'Completed lore collection earns a bronze trophy'
);

if (failures === 0) {
  console.log('\nALL LORE AWARD TESTS PASSED');
} else {
  console.error(`\n${failures} LORE AWARD TEST(S) FAILED`);
  process.exit(1);
}


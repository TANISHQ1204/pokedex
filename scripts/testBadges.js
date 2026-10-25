import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBadgeStatus } from '../src/game/badges.js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const badgesPath = path.join(__dirname, '../src/data/badges.json');
const badges = JSON.parse(fs.readFileSync(badgesPath, 'utf-8'));

console.log('--- Testing Badge System Logic (20-star) ---');
console.log('Total loaded badges:', badges.length);

let failures = 0;
function check(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

const kantoBadge = badges.find((b) => b.id === 'badge_kanto');
const boulderBadge = badges.find((b) => b.id === 'badge_boulder');

const empty = getBadgeStatus(kantoBadge, []);
check(!empty.isUnlocked, 'Empty collection leaves set badge locked');

const partialBoulderCollection = boulderBadge.pokemonIds.slice(0, 8).map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const partial = getBadgeStatus(boulderBadge, partialBoulderCollection);
check(!partial.isUnlocked, 'Partial badge set remains locked');

const fullBoulderCollection = boulderBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const full = getBadgeStatus(boulderBadge, fullBoulderCollection);
check(full.isUnlocked, 'Complete badge set unlocks');

const kantoMasteryBadge = badges.find((b) => b.id === 'badge_master_kanto');
check(Boolean(kantoMasteryBadge), 'Star-mastery Kanto badge exists');
check(kantoMasteryBadge?.criteria === 'star20', 'Mastery badge uses star20 criteria');

const ownedStar1Collection = kantoMasteryBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const star1 = getBadgeStatus(kantoMasteryBadge, ownedStar1Collection);
check(!star1.isUnlocked, 'Owned at 1★ does not unlock mastery badge');

const halfMastered = kantoMasteryBadge.pokemonIds.map((id, idx) => ({
  pokemon_id: id,
  star_level: idx % 2 === 0 ? MAX_STAR_LEVEL : 1,
}));
const half = getBadgeStatus(kantoMasteryBadge, halfMastered);
check(!half.isUnlocked, 'Partial 20★ mastery remains locked');

const allMastered = kantoMasteryBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: MAX_STAR_LEVEL,
}));
const mastered = getBadgeStatus(kantoMasteryBadge, allMastered);
check(mastered.isUnlocked, 'All cards at 20★ unlock mastery badge');
check(mastered.masteredCount === mastered.totalCount, 'Every mastery member is counted');

const shinyMasterBadge = badges.find((b) => b.id === 'badge_shiny_master');
console.log('Shiny Master Badge covers', shinyMasterBadge?.pokemonIds.length ?? 0, 'species across all regions.');

if (failures === 0) {
  console.log('\nALL BADGE TESTS PASSED');
} else {
  console.error(`\n${failures} BADGE TEST(S) FAILED`);
  process.exit(1);
}

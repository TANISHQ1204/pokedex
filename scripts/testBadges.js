import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBadgeStatus } from '../src/game/badges.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const badgesPath = path.join(__dirname, '../src/data/badges.json');
const badges = JSON.parse(fs.readFileSync(badgesPath, 'utf-8'));

console.log('--- Testing Badge System Logic ---');
console.log('Total loaded badges:', badges.length);

const kantoBadge = badges.find((b) => b.id === 'badge_kanto');
const boulderBadge = badges.find((b) => b.id === 'badge_boulder');

// Test 1: Empty collection -> Locked
const status1 = getBadgeStatus(kantoBadge, []);
console.log('Test 1 (Empty collection): Kanto status =', status1.isUnlocked ? 'Unlocked' : 'Locked', `(Expected: Locked)`);
if (!status1.isUnlocked) {
  console.log('✅ Success! Incomplete badge set is locked.');
} else {
  console.error('❌ Failed! Should be locked.');
}

// Test 2: 8/9 owned -> Locked
const partialBoulderCollection = boulderBadge.pokemonIds.slice(0, 8).map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const status2 = getBadgeStatus(boulderBadge, partialBoulderCollection);
console.log('Test 2 (8/9 owned): Boulder status =', status2.isUnlocked ? 'Unlocked' : 'Locked', `(${status2.ownedCount}/${status2.totalCount}) - Expected: Locked`);
if (!status2.isUnlocked) {
  console.log('✅ Success! Partial badge set is locked.');
} else {
  console.error('❌ Failed! Should be locked.');
}

// Test 3: 9/9 owned -> Unlocked
const fullBoulderCollection = boulderBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const status3 = getBadgeStatus(boulderBadge, fullBoulderCollection);
console.log('Test 3 (9/9 owned): Boulder status =', status3.isUnlocked ? 'Unlocked' : 'Locked', `(${status3.ownedCount}/${status3.totalCount}) - Expected: Unlocked`);
if (status3.isUnlocked) {
  console.log('✅ Success! 100% completed badge set unlocks badge.');
} else {
  console.error('❌ Failed! Should be unlocked.');
}

const kantoMasteryBadge = badges.find((b) => b.id === 'badge_master_kanto');

if (!kantoMasteryBadge) {
  console.error('❌ Failed! Star-mastery Kanto badge missing from badges.json.');
  process.exit(1);
}

// Test 4: owned but under 10★ -> Locked
const ownedStar1Collection = kantoMasteryBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const status4 = getBadgeStatus(kantoMasteryBadge, ownedStar1Collection);
console.log('Test 4 (owned @ 1★): Kanto Mastery =', status4.isUnlocked ? 'Unlocked' : 'Locked', `(${status4.masteredCount}/${status4.totalCount}) - Expected: Locked`);
if (!status4.isUnlocked) {
  console.log('✅ Success! Star-mastery badge stays locked below 10★.');
} else {
  console.error('❌ Failed! Should be locked.');
}

// Test 5: 50% at 10★ -> Locked
const halfMastered = kantoMasteryBadge.pokemonIds.map((id, idx) => ({
  pokemon_id: id,
  star_level: idx % 2 === 0 ? 10 : 1,
}));
const status5 = getBadgeStatus(kantoMasteryBadge, halfMastered);
console.log('Test 5 (50% @ 10★): Kanto Mastery =', status5.isUnlocked ? 'Unlocked' : 'Locked', `(${status5.masteredCount}/${status5.totalCount}) - Expected: Locked`);
if (!status5.isUnlocked) {
  console.log('✅ Success! Partial star mastery stays locked.');
} else {
  console.error('❌ Failed! Should be locked.');
}

// Test 6: 100% at 10★ -> Unlocked
const allMastered = kantoMasteryBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 10,
}));
const status6 = getBadgeStatus(kantoMasteryBadge, allMastered);
console.log('Test 6 (100% @ 10★): Kanto Mastery =', status6.isUnlocked ? 'Unlocked' : 'Locked', `(${status6.masteredCount}/${status6.totalCount}) - Expected: Unlocked`);
if (status6.isUnlocked) {
  console.log('✅ Success! Full star mastery unlocks badge.');
} else {
  console.error('❌ Failed! Should be unlocked.');
}

const shinyMasterBadge = badges.find((b) => b.id === 'badge_shiny_master');
console.log('Shiny Master Badge covers', shinyMasterBadge?.pokemonIds.length ?? 0, 'species across all regions.');

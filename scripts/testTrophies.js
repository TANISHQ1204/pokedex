import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollectionProgress, getTrophyTier } from '../src/game/trophies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collectionsPath = path.join(__dirname, '../src/data/collections.json');
const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf-8'));

console.log('--- Testing Trophy System Logic ---');
console.log('Total loaded collections:', collections.length);

const fireCollection = collections.find((c) => c.id === 'type_fire');
console.log('Fire Collection member count:', fireCollection.pokemonIds.length);

// Test 1: Empty collection -> Locked
const tier1 = getTrophyTier(fireCollection, []);
console.log('Test 1 (Empty collection):', tier1.tierName, `(Expected: Locked)`);
if (tier1.tier === 'locked') {
  console.log('✅ Success! Incomplete collection is locked.');
} else {
  console.error('❌ Failed! Should be locked.');
}

// Test 2: Full collection with Star Level 1 -> Bronze
const mockStar1Collection = fireCollection.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const tier2 = getTrophyTier(fireCollection, mockStar1Collection);
console.log('Test 2 (100% owned @ 1 star):', tier2.tierName, `(Avg: ${tier2.progress.avgStarLevel}) - Expected: Bronze Trophy`);
if (tier2.tier === 'bronze') {
  console.log('✅ Success! Bronze trophy awarded.');
} else {
  console.error('❌ Failed! Should be bronze.');
}

// Test 3: Full collection with Star Level 3.5 -> Silver
const mockStar3Collection = fireCollection.pokemonIds.map((id, idx) => ({
  pokemon_id: id,
  star_level: idx % 2 === 0 ? 3 : 4,
}));
const tier3 = getTrophyTier(fireCollection, mockStar3Collection);
console.log('Test 3 (100% owned @ 3.5 stars):', tier3.tierName, `(Avg: ${tier3.progress.avgStarLevel}) - Expected: Silver Trophy`);
if (tier3.tier === 'silver') {
  console.log('✅ Success! Silver trophy awarded.');
} else {
  console.error('❌ Failed! Should be silver.');
}

// Test 4: Full collection with Star Level 5 -> Gold
const mockStar5Collection = fireCollection.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 5,
}));
const tier4 = getTrophyTier(fireCollection, mockStar5Collection);
console.log('Test 4 (100% owned @ 5 stars):', tier4.tierName, `(Avg: ${tier4.progress.avgStarLevel}) - Expected: Gold Trophy`);
if (tier4.tier === 'gold') {
  console.log('✅ Success! Gold trophy awarded.');
} else {
  console.error('❌ Failed! Should be gold.');
}

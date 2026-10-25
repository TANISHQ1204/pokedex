import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTrophyTier } from '../src/game/trophies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collectionsPath = path.join(__dirname, '../src/data/collections.json');
const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf-8'));

console.log('--- Testing Trophy System Logic (20-star) ---');
console.log('Total loaded collections:', collections.length);

const fireCollection = collections.find((c) => c.id === 'type_fire');
console.log('Fire Collection member count:', fireCollection.pokemonIds.length);

let failures = 0;
function expectTier(collection, starLevel, expected, label) {
  const mock = collection.pokemonIds.map((id) => ({
    pokemon_id: id,
    star_level: starLevel,
  }));
  const result = getTrophyTier(collection, mock);
  console.log(`${label}: ${result.tierName} (Avg: ${result.progress.avgStarLevel}) - Expected: ${expected}`);
  if (result.tier === expected) {
    console.log('  PASS');
  } else {
    failures += 1;
    console.error(`  FAIL: expected ${expected}`);
  }
}

const empty = getTrophyTier(fireCollection, []);
console.log('Empty collection:', empty.tierName, '(Expected: Locked)');
if (empty.tier !== 'locked') {
  failures += 1;
  console.error('  FAIL: expected locked');
}

expectTier(fireCollection, 1, 'bronze', 'Test 2 (100% owned @ 1 star)');
expectTier(fireCollection, 6, 'silver', 'Test 3 (100% owned @ 6 stars)');
expectTier(fireCollection, 10, 'gold', 'Test 4 (100% owned @ 10 stars)');
expectTier(fireCollection, 14, 'platinum', 'Test 5 (100% owned @ 14 stars)');
expectTier(fireCollection, 17, 'diamond', 'Test 6 (100% owned @ 17 stars)');
expectTier(fireCollection, 20, 'master', 'Test 7 (100% owned @ 20 stars)');

if (failures === 0) {
  console.log('\nALL TROPHY TESTS PASSED');
} else {
  console.error(`\n${failures} TROPHY TEST(S) FAILED`);
  process.exit(1);
}

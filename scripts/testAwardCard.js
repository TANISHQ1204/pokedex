import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rollCardDrop } from '../src/game/drops.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokemonDataPath = path.join(__dirname, '../src/data/pokemon.json');
const pokemonList = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));

console.log('--- Testing Card Roll Drop Function ---');

// Test 1: Empty collection -> All Pokemon eligible
const drop1 = rollCardDrop([], pokemonList);
console.log('Drop 1 (Empty Collection):', drop1.name, `(ID: ${drop1.id})`);

// Test 2: User has maxed out IDs 1..1000 -> Only IDs 1001..1025 eligible
const mockMaxedIds = Array.from({ length: 1000 }, (_, i) => i + 1);
const mockMaxedCollection = mockMaxedIds.map((id) => ({
  pokemon_id: id,
  star_level: 5,
  dupes_collected: 20,
  is_shiny: true,
}));

const drop2 = rollCardDrop(mockMaxedCollection, pokemonList);
console.log('Drop 2 (IDs 1-1000 maxed):', drop2.name, `(ID: ${drop2.id}) - Expected ID > 1000`);

if (drop2.id > 1000) {
  console.log('✅ Success! Maxed cards (IDs 1-1000) were properly excluded from drop pool.');
} else {
  console.error('❌ Failed! Maxed cards were not excluded.');
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rollBattleDrop } from '../src/game/drops.js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokemonDataPath = path.join(__dirname, '../src/data/pokemon.json');
const pokemonList = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));

console.log('--- Testing Card Roll Drop Function ---');

const emptyDrop = rollBattleDrop([], pokemonList);
console.log('Empty collection drop:', emptyDrop.pokemon.name, `(ID: ${emptyDrop.pokemon.id})`);

const mockMaxedIds = Array.from({ length: 1000 }, (_, i) => i + 1);
const mockMaxedCollection = mockMaxedIds.map((id) => ({
  pokemon_id: id,
  star_level: MAX_STAR_LEVEL,
  dupes_collected: MAX_STAR_LEVEL - 1,
  is_shiny: true,
}));

const maxedDrop = rollBattleDrop(mockMaxedCollection, pokemonList);
console.log('IDs 1-1000 maxed drop:', maxedDrop.pokemon.name, `(ID: ${maxedDrop.pokemon.id})`);

if (maxedDrop.pokemon.id > 1000) {
  console.log('PASS: 20-star maxed cards were excluded from the drop pool.');
} else {
  console.error('FAIL: Maxed cards were not excluded.');
  process.exit(1);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTypeEffectiveness, calculateDamage, applyStatusMove } from '../src/game/battle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokemonDataPath = path.join(__dirname, '../src/data/pokemon.json');
const pokemonList = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));

const bulbasaur = pokemonList.find((p) => p.name === 'bulbasaur');
const charmander = pokemonList.find((p) => p.name === 'charmander');
const squirtle = pokemonList.find((p) => p.name === 'squirtle');

console.log('--- Testing Type Effectiveness ---');
const fireVsGrass = getTypeEffectiveness('fire', bulbasaur.types);
console.log(`Fire vs Bulbasaur (${bulbasaur.types.join('/')}): ${fireVsGrass}x (Expected: 2.0x)`);

const waterVsFire = getTypeEffectiveness('water', charmander.types);
console.log(`Water vs Charmander (${charmander.types.join('/')}): ${waterVsFire}x (Expected: 2.0x)`);

const grassVsWater = getTypeEffectiveness('grass', squirtle.types);
console.log(`Grass vs Squirtle (${squirtle.types.join('/')}): ${grassVsWater}x (Expected: 2.0x)`);

console.log('\n--- Testing Damage Calculations ---');
const charmanderMove = charmander.moves.find((m) => m.power > 0) || charmander.moves[0];
const dmg1 = calculateDamage(charmander, bulbasaur, charmanderMove);
console.log(`Charmander (${charmanderMove.name}) vs Bulbasaur:`, dmg1);

const squirtleMove = squirtle.moves.find((m) => m.power > 0) || squirtle.moves[0];
const dmg2 = calculateDamage(squirtle, charmander, squirtleMove);
console.log(`Squirtle (${squirtleMove.name}) vs Charmander:`, dmg2);

console.log('\n--- Testing Status Moves ---');
const bulbasaurStatusMove = bulbasaur.moves.find((m) => m.category === 'status') || bulbasaur.moves[0];
const bulbasaurStatus = applyStatusMove(bulbasaur, bulbasaurStatusMove);
console.log(`Bulbasaur (${bulbasaurStatusMove.name}):`, bulbasaurStatus);

const squirtleStatusMove = squirtle.moves.find((m) => m.category === 'status') || squirtle.moves[0];
const squirtleStatus = applyStatusMove(squirtle, squirtleStatusMove);
console.log(`Squirtle (${squirtleStatusMove.name}):`, squirtleStatus);

console.log('\n✅ All battle math tests executed successfully!');

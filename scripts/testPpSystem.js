import defaultPokemonList from '../src/data/pokemon.json' with { type: 'json' };
import { generateRandomTeam, selectCpuMove, calculateDamage, STRUGGLE_MOVE } from '../src/game/battle.js';

console.log('--- Testing 4-Move Set & PP System ---');

// Test 1: Generate team and verify 4 moves per Pokémon with PP
const team = generateRandomTeam(defaultPokemonList, 1);
const pkmn = team[0];

console.log(`Generated ${pkmn.name} (HP: ${pkmn.currentHp}/${pkmn.maxHp})`);
console.log(`Moves count: ${pkmn.moves.length} (Expected: 4)`);
pkmn.moves.forEach((m, idx) => {
  console.log(`  Move ${idx + 1}: ${m.name} (${m.type}, Pwr: ${m.power}, PP: ${m.currentPp}/${m.maxPp})`);
});

if (pkmn.moves.length === 4) {
  console.log('✅ Success! 4-move set loaded cleanly with PP.');
} else {
  console.error('❌ Failed! Move set length is not 4.');
}

// Test 2: Set all PP to 0 and verify Struggle fallback
pkmn.moves.forEach((m) => {
  m.currentPp = 0;
});

const cpuChoice = selectCpuMove(pkmn, team[0]);
console.log('\nTesting CPU choice when all PP = 0:');
console.log('Chosen move:', cpuChoice.move.name, '(isStruggle:', cpuChoice.move.isStruggle, ')');

if (cpuChoice.move.isStruggle) {
  console.log('✅ Success! Struggle fallback selected when PP is depleted.');
} else {
  console.error('❌ Failed! Struggle was not selected.');
}

// Test 3: Calculate Struggle damage and recoil
const recoilCalc = calculateDamage(pkmn, team[0], STRUGGLE_MOVE);
console.log('\nStruggle Damage & Recoil Calculation:', recoilCalc);

if (recoilCalc.recoil > 0) {
  console.log('✅ Success! Struggle deals damage and inflicts recoil back on attacker.');
} else {
  console.error('❌ Failed! Recoil calculation was 0.');
}

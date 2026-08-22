import { getTypeEffectiveness, TYPE_CHART } from '../src/game/battle.js';

let passed = 0;
let failed = 0;

function assertEqual(moveType, defenderTypes, expected, description) {
  const actual = getTypeEffectiveness(moveType, defenderTypes);
  if (Math.abs(actual - expected) < 0.0001) {
    console.log(`[PASS] ${description}: ${moveType} vs ${JSON.stringify(defenderTypes)} = ${actual}x (expected ${expected}x)`);
    passed++;
  } else {
    console.error(`[FAIL] ${description}: ${moveType} vs ${JSON.stringify(defenderTypes)} = ${actual}x (expected ${expected}x)`);
    failed++;
  }
}

console.log('--- RUNNING POKEMON TYPE EFFECTIVENESS TESTS ---');

// 1. Single-type basic & required test cases
assertEqual('water', ['fire'], 2.0, 'Water vs Fire');
assertEqual('electric', ['ground'], 0.0, 'Electric vs Ground (Immunity)');
assertEqual('fighting', ['ghost'], 0.0, 'Fighting vs Ghost (Immunity)');
assertEqual('ghost', ['normal'], 0.0, 'Ghost vs Normal (Immunity)');
assertEqual('normal', ['ghost'], 0.0, 'Normal vs Ghost (Immunity)');

// 2. Specific check: Rock vs Electric (Rock is NOT immune to Electric, Ground is)
assertEqual('electric', ['rock'], 1.0, 'Electric vs Rock (Normal 1.0x damage)');
assertEqual('electric', ['rock', 'ground'], 0.0, 'Electric vs Rock/Ground dual-type (0.0x due to Ground)');

// 3. Dragon vs Dragon check (Dragon is super-effective vs Dragon, NOT immune)
assertEqual('dragon', ['dragon'], 2.0, 'Dragon vs Dragon (2.0x super-effective)');
assertEqual('dragon', ['fairy'], 0.0, 'Dragon vs Fairy (Fairy immunity)');

// 4. Grass vs Fire / Water / Ground dual type combos
assertEqual('grass', ['fire', 'water'], 1.0, 'Grass vs Fire/Water (0.5 * 2.0 = 1.0x)');
assertEqual('grass', ['water', 'ground'], 4.0, 'Grass vs Water/Ground (2.0 * 2.0 = 4.0x super effective)');
assertEqual('grass', ['fire', 'ground'], 1.0, 'Grass vs Fire/Ground (0.5 * 2.0 = 1.0x)');
assertEqual('water', ['fire', 'ground'], 4.0, 'Water vs Fire/Ground (2.0 * 2.0 = 4.0x super effective)');

// 5. Gen 6 Fairy & Steel rules checks
assertEqual('fairy', ['dragon'], 2.0, 'Fairy vs Dragon (2.0x)');
assertEqual('ghost', ['steel'], 1.0, 'Ghost vs Steel (Gen 6+ 1.0x)');
assertEqual('dark', ['steel'], 1.0, 'Dark vs Steel (Gen 6+ 1.0x)');

// 6. Verify full 18-type matrix presence
const expectedTypes = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];
console.log(`\nVerifying all ${expectedTypes.length} types exist in TYPE_CHART...`);
let chartKeys = Object.keys(TYPE_CHART);
if (chartKeys.length === 18 && expectedTypes.every((t) => chartKeys.includes(t))) {
  console.log(`[PASS] TYPE_CHART contains all 18 types!`);
  passed++;
} else {
  console.error(`[FAIL] TYPE_CHART types missing! Found ${chartKeys.length} types.`);
  failed++;
}

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

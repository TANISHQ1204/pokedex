import {
  applyStatusCondition,
  checkTurnStartStatus,
  applyEndOfTurnStatus,
  getEffectiveSpeed,
  calculateDamage,
} from '../src/game/battle.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passed++;
  } else {
    console.error(`[FAIL] ${description}`);
    failed++;
  }
}

console.log('--- RUNNING POKEMON STATUS CONDITION TESTS ---');

// Mock Pokemon helper
function createMockPokemon(overrides = {}) {
  return {
    name: 'Pikachu',
    types: ['electric'],
    stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
    currentHp: 100,
    maxHp: 100,
    isFainted: false,
    status: 'none',
    sleepTurns: 0,
    confusion: false,
    confusionTurns: 0,
    ...overrides,
  };
}

// 1. Test Status Application & Exclusivity
const pkmn1 = createMockPokemon({ name: 'Bulbasaur', types: ['grass'] });
const res1 = applyStatusCondition(pkmn1, 'poison', 1.0, 1.0);
assert(res1.success && pkmn1.status === 'poison', 'Bulbasaur poisoned successfully');

const res2 = applyStatusCondition(pkmn1, 'burn', 1.0, 1.0);
assert(!res2.success && res2.reason === 'already_statused' && pkmn1.status === 'poison', 'Poisoned Bulbasaur cannot be burned (mutually exclusive)');

// 2. Test Volatile Confusion Stacking
const res3 = applyStatusCondition(pkmn1, 'confusion', 1.0, 1.0);
assert(res3.success && pkmn1.confusion === true && pkmn1.status === 'poison', 'Confusion stacks alongside Poison non-volatile status');

// 3. Test Type Immunities
const firePkmn = createMockPokemon({ name: 'Charizard', types: ['fire', 'flying'] });
const resBurnImmune = applyStatusCondition(firePkmn, 'burn', 1.0, 1.0);
assert(!resBurnImmune.success && resBurnImmune.reason === 'immune', 'Fire-type Charizard is immune to Burn');

const poisonPkmn = createMockPokemon({ name: 'Gengar', types: ['ghost', 'poison'] });
const resPsnImmune = applyStatusCondition(poisonPkmn, 'poison', 1.0, 1.0);
assert(!resPsnImmune.success && resPsnImmune.reason === 'immune', 'Poison-type Gengar is immune to Poison');

const steelPkmn = createMockPokemon({ name: 'Steelix', types: ['steel', 'ground'] });
const resSteelImmune = applyStatusCondition(steelPkmn, 'poison', 1.0, 1.0);
assert(!resSteelImmune.success && resSteelImmune.reason === 'immune', 'Steel-type Steelix is immune to Poison');

const elecPkmn = createMockPokemon({ name: 'Raichu', types: ['electric'] });
const resParImmune = applyStatusCondition(elecPkmn, 'paralysis', 1.0, 1.0);
assert(!resParImmune.success && resParImmune.reason === 'immune', 'Electric-type Raichu is immune to Paralysis');

const icePkmn = createMockPokemon({ name: 'Lapras', types: ['water', 'ice'] });
const resFrzImmune = applyStatusCondition(icePkmn, 'freeze', 1.0, 1.0);
assert(!resFrzImmune.success && resFrzImmune.reason === 'immune', 'Ice-type Lapras is immune to Freeze');

// 4. Test Poison End-of-Turn Damage (1/8 max HP = 12 damage for 100 HP)
const psnTarget = createMockPokemon({ status: 'poison', currentHp: 100, maxHp: 100 });
const psnLogs = applyEndOfTurnStatus(psnTarget);
assert(psnTarget.currentHp === 88 && psnLogs.length === 1, 'Poison deals 1/8 max HP damage at end of turn (100 -> 88)');

// 5. Test Burn End-of-Turn Damage (1/16 max HP = 6 damage for 100 HP)
const brnTarget = createMockPokemon({ status: 'burn', currentHp: 100, maxHp: 100 });
const brnLogs = applyEndOfTurnStatus(brnTarget);
assert(brnTarget.currentHp === 94 && brnLogs.length === 1, 'Burn deals 1/16 max HP damage at end of turn (100 -> 94)');

// 6. Test Burn Physical Damage Halving
const normalAttacker = createMockPokemon({ status: 'none' });
const burnedAttacker = createMockPokemon({ status: 'burn' });
const dummyDefender = createMockPokemon();
const physMove = { id: 'tackle', name: 'Tackle', type: 'normal', power: 50, category: 'physical' };

const normalDmg = calculateDamage(normalAttacker, dummyDefender, physMove).damage;
const burnedDmg = calculateDamage(burnedAttacker, dummyDefender, physMove).damage;
assert(burnedDmg < normalDmg, `Burn halves physical damage (Normal ${normalDmg} vs Burned ${burnedDmg})`);

// 7. Test Paralysis Speed Reduction
const parPkmn = createMockPokemon({ status: 'paralysis', stats: { speed: 100 } });
const speed = getEffectiveSpeed(parPkmn);
assert(speed === 50, `Paralysis halves effective speed (100 -> ${speed})`);

// 8. Test Sleep Turn Decrement & Wakeup
const slpPkmn = createMockPokemon({ status: 'sleep', sleepTurns: 1 });
const slpRes = checkTurnStartStatus(slpPkmn);
assert(!slpRes.cantMove && slpPkmn.status === 'none', 'Sleep decrements turns and wakes up when sleepTurns reaches 0');

const slpPkmn2 = createMockPokemon({ status: 'sleep', sleepTurns: 2 });
const slpRes2 = checkTurnStartStatus(slpPkmn2);
assert(slpRes2.cantMove && slpPkmn2.status === 'sleep' && slpPkmn2.sleepTurns === 1, 'Sleep blocks movement while sleepTurns > 0');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

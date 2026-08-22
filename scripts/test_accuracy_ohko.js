import {
  getMoveAccuracy,
  isOhkoMove,
  getTypeEffectiveness,
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

console.log('--- RUNNING MOVE ACCURACY & OHKO TESTS ---');

// 1. Test Accuracy Lookup
const fissureMove = { id: 'fissure', name: 'Fissure', type: 'ground', power: 0, category: 'physical' };
const thunderMove = { id: 'thunder', name: 'Thunder', type: 'electric', power: 110, category: 'special' };
const tackleMove = { id: 'tackle', name: 'Tackle', type: 'normal', power: 40, category: 'physical' };

assert(isOhkoMove(fissureMove) === true, 'Fissure recognized as OHKO move');
assert(getMoveAccuracy(fissureMove) === 30, 'Fissure has 30% flat accuracy');
assert(getMoveAccuracy(thunderMove) === 70, 'Thunder has 70% accuracy');
assert(getMoveAccuracy(tackleMove) === 100, 'Tackle defaults to 100% accuracy');

// 2. Test All 4 OHKO Moves
const ohkoList = [
  { id: 'fissure', type: 'ground' },
  { id: 'guillotine', type: 'normal' },
  { id: 'horn_drill', type: 'normal' },
  { id: 'sheer_cold', type: 'ice' },
];

ohkoList.forEach((m) => {
  assert(isOhkoMove(m) === true && getMoveAccuracy(m) === 30, `${m.id} is an OHKO move with 30% accuracy`);
});

// 3. Test Type Immunity Pre-Check for OHKO Moves
// Fissure (Ground) vs Flying-type defender (e.g. Charizard [fire, flying])
const flyingDefender = ['fire', 'flying'];
const fissureEff = getTypeEffectiveness('ground', flyingDefender);
assert(fissureEff === 0.0, 'Fissure (Ground OHKO) has 0.0x effectiveness against Flying-type defender');

// Guillotine / Horn Drill (Normal) vs Ghost-type defender (e.g. Gengar [ghost, poison])
const ghostDefender = ['ghost', 'poison'];
const guillotineEff = getTypeEffectiveness('normal', ghostDefender);
assert(guillotineEff === 0.0, 'Guillotine (Normal OHKO) has 0.0x effectiveness against Ghost-type defender');

// Sheer Cold (Ice) vs Dragon/Flying (Dragonite) -> Super effective (2x * 2x = 4x)
const dragonFlying = ['dragon', 'flying'];
const sheerColdEff = getTypeEffectiveness('ice', dragonFlying);
assert(sheerColdEff === 4.0, 'Sheer Cold (Ice OHKO) has 4.0x effectiveness against Dragon/Flying defender');

// 4. Test Accuracy Roll Logic Simulation
let hits = 0;
let misses = 0;
const acc = 30;
for (let i = 0; i < 1000; i++) {
  const roll = Math.random() * 100;
  if (roll <= acc) hits++;
  else misses++;
}
assert(hits > 200 && hits < 400, `Simulated 1000 rolls of 30% accuracy resulted in ~300 hits (Actual: ${hits} hits, ${misses} misses)`);

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

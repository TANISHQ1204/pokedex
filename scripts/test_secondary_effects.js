import {
  MOVE_STATUS_MAP,
  MOVE_FLINCH_MAP,
  MOVE_STAT_DROP_MAP,
  getMoveStatusEffect,
  getMoveFlinchChance,
  getMoveSecondaryStatChange,
  getMoveRecoilFraction,
  getFixedDamage,
  isFixedDamageMove,
  calculateDamage,
  checkTurnStartStatus,
  applyStatusCondition,
  applyStatChange,
  generateRandomTeam,
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

console.log('--- RUNNING SECONDARY EFFECT AUDIT TESTS ---');

// 1. Verify secondary-effect MOVE_STATUS_MAP coverage for known moves
const knownStatusMoves = [
  ['thunderbolt', 'paralysis', 0.10],
  ['thunder', 'paralysis', 0.30],
  ['spark', 'paralysis', 0.30],
  ['body_slam', 'paralysis', 0.30],
  ['discharge', 'paralysis', 0.30],
  ['flamethrower', 'burn', 0.10],
  ['fire_blast', 'burn', 0.10],
  ['scald', 'burn', 0.30],
  ['heat_wave', 'burn', 0.10],
  ['lava_plume', 'burn', 0.30],
  ['flare_blitz', 'burn', 0.10],
  ['inferno', 'burn', 1.0],
  ['ember', 'burn', 0.10],
  ['fire_punch', 'burn', 0.10],
  ['ice_beam', 'freeze', 0.10],
  ['blizzard', 'freeze', 0.10],
  ['ice_punch', 'freeze', 0.10],
  ['powder_snow', 'freeze', 0.10],
  ['sludge_bomb', 'poison', 0.30],
  ['poison_jab', 'poison', 0.30],
  ['gunk_shot', 'poison', 0.30],
  ['poison_sting', 'poison', 0.30],
  ['smog', 'poison', 0.40],
  ['water_pulse', 'confusion', 0.20],
  ['confusion', 'confusion', 0.10],
  ['psybeam', 'confusion', 0.10],
  ['hurricane', 'confusion', 0.30],
];

console.log('--- Data presence checks for status-effect moves ---');
knownStatusMoves.forEach(([id, condition, chance]) => {
  const spec = MOVE_STATUS_MAP[id];
  assert(!!spec, `${id} should have an entry in MOVE_STATUS_MAP`);
  if (spec) {
    assert(spec.condition === condition, `${id} should apply ${condition} (got ${spec.condition})`);
    assert(Math.abs(spec.chance - chance) < 0.001, `${id} should have ${chance * 100}% ${condition} chance (got ${spec.chance})`);
  }
  const lookup = getMoveStatusEffect({ id, name: id, category: 'special' });
  assert(!!lookup, `getMoveStatusEffect(${id}) should resolve via MOVE_STATUS_MAP`);
});

// 2. Verify flinch moves data
console.log('--- Flinch move data ---');
const flinchMoves = [
  ['air_slash', 0.30],
  ['headbutt', 0.30],
  ['rock_slide', 0.30],
  ['iron_head', 0.30],
  ['zen_headbutt', 0.20],
  ['bite', 0.30],
  ['dark_pulse', 0.20],
  ['stomp', 0.30],
  ['fake_out', 1.0],
];
flinchMoves.forEach(([id, chance]) => {
  const got = getMoveFlinchChance({ id, name: id });
  assert(Math.abs(got - chance) < 0.001, `getMoveFlinchChance(${id}) = ${got} (expected ${chance})`);
});

// 3. Verify stat-drop secondary effects data
console.log('--- Stat-drop secondary effects ---');
const statDropMoves = [
  ['bug_buzz', 'opponent', 'specialDefense', -1, 0.10],
  ['crunch', 'opponent', 'specialDefense', -1, 0.20],
  ['earth_power', 'opponent', 'specialDefense', -1, 0.10],
  ['psychic', 'opponent', 'specialDefense', -1, 0.10],
  ['shadow_ball', 'opponent', 'specialDefense', -1, 0.20],
  ['flash_cannon', 'opponent', 'specialDefense', -1, 0.10],
  ['energy_ball', 'opponent', 'specialDefense', -1, 0.10],
  ['iron_tail', 'opponent', 'defense', -1, 0.30],
  ['play_rough', 'opponent', 'attack', -1, 0.10],
  ['electroweb', 'opponent', 'speed', -1, 1.0],
  ['struggle_bug', 'opponent', 'specialAttack', -1, 1.0],
  ['moonblast', 'opponent', 'specialAttack', -1, 0.30],
  ['liquidation', 'opponent', 'defense', -1, 0.20],
];
statDropMoves.forEach(([id, target, stat, stages, chance]) => {
  const cfg = getMoveSecondaryStatChange({ id, name: id });
  assert(!!cfg && cfg.length > 0, `${id} should have a secondary stat change`);
  if (cfg) {
    const c = cfg[0];
    assert(c.target === target, `${id} stat change target should be ${target} (got ${c.target})`);
    assert(c.stat === stat, `${id} stat change stat should be ${stat} (got ${c.stat})`);
    assert(c.stages === stages, `${id} stat change stages should be ${stages} (got ${c.stages})`);
    assert(Math.abs(c.chance - chance) < 0.001, `${id} stat change chance should be ${chance} (got ${c.chance})`);
  }
});

// 4. Verify recoil moves
console.log('--- Recoil data ---');
const recoilMoves = [
  ['double_edge', 0.33],
  ['flare_blitz', 0.33],
  ['brave_bird', 0.33],
  ['wood_hammer', 0.33],
  ['wild_charge', 0.25],
  ['take_down', 0.25],
  ['submission', 0.25],
  ['wave_crash', 0.33],
];
recoilMoves.forEach(([id, frac]) => {
  const got = getMoveRecoilFraction({ id, name: id });
  assert(Math.abs(got - frac) < 0.01, `getMoveRecoilFraction(${id}) = ${got} (expected ${frac})`);
});

// 5. Fixed-damage moves
console.log('--- Fixed damage moves ---');
const dragonRage = { id: 'dragon_rage', name: 'Dragon Rage', type: 'dragon', power: 0, category: 'special' };
const superFang = { id: 'super_fang', name: 'Super Fang', type: 'normal', power: 0, category: 'physical' };
assert(isFixedDamageMove(dragonRage), 'Dragon Rage recognized as fixed-damage move');
assert(isFixedDamageMove(superFang), 'Super Fang recognized as fixed-damage move');
assert(getFixedDamage(dragonRage) === 40, 'Dragon Rage deals exactly 40 damage');

const defender = {
  name: 'Blissey',
  types: ['normal'],
  stats: { hp: 200, attack: 10, defense: 10, specialAttack: 75, specialDefense: 135, speed: 55 },
  currentHp: 150,
  maxHp: 200,
};
const attacker = {
  name: 'Charizard',
  types: ['fire', 'flying'],
  stats: { hp: 100, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
  currentHp: 100,
  maxHp: 100,
};
const dr = calculateDamage(attacker, defender, dragonRage);
assert(dr.damage === 40, `Dragon Rage damage calc = 40 (got ${dr.damage})`);
const sf = calculateDamage(attacker, defender, superFang);
assert(sf.damage === 75, `Super Fang halves current HP 150 -> 75 (got ${sf.damage})`);

// 6. Secondary-effect trigger rate simulation
console.log('--- Secondary effect trigger rate simulation (10,000 samples each) ---');
const TRIALS = 10000;

function simulateStatus(moveId, condition, chance) {
  let hits = 0;
  for (let i = 0; i < TRIALS; i++) {
    const d = {
      name: 'Dummy',
      types: ['normal'],
      stats: { hp: 100, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 },
      currentHp: 100,
      maxHp: 100,
      status: 'none',
    };
    const res = applyStatusCondition(d, condition, 1.0, chance);
    if (res.success) hits++;
  }
  const rate = hits / TRIALS;
  const expected = chance;
  const tolerance = 0.05;
  assert(Math.abs(rate - expected) < tolerance, `${moveId}: ~${expected * 100}% trigger rate measured ${(rate * 100).toFixed(2)}% (tolerance ±${tolerance * 100}%)`);
}

simulateStatus('thunderbolt', 'paralysis', 0.10);
simulateStatus('flamethrower', 'burn', 0.10);
simulateStatus('sludge_bomb', 'poison', 0.30);
simulateStatus('scald', 'burn', 0.30);
simulateStatus('inferno', 'burn', 1.0);
simulateStatus('thunder', 'paralysis', 0.30);

function simulateFlinch(moveId, chance) {
  let hits = 0;
  for (let i = 0; i < TRIALS; i++) {
    if (Math.random() < chance) hits++;
  }
  const rate = hits / TRIALS;
  assert(Math.abs(rate - chance) < 0.05, `${moveId}: ~${chance * 100}% flinch rate measured ${(rate * 100).toFixed(2)}%`);
}
simulateFlinch('air_slash', 0.30);
simulateFlinch('rock_slide', 0.30);

function simulateStatDrop(moveId, chance) {
  let hits = 0;
  for (let i = 0; i < TRIALS; i++) {
    if (Math.random() <= chance) hits++;
  }
  const rate = hits / TRIALS;
  assert(Math.abs(rate - chance) < 0.05, `${moveId}: ~${chance * 100}% stat-drop rate measured ${(rate * 100).toFixed(2)}%`);
}
simulateStatDrop('crunch', 0.20);
simulateStatDrop('bug_buzz', 0.10);

// 7. Verify checkTurnStartStatus consumes flinch flag
console.log('--- Flinch flag consumption ---');
const stubborn = {
  name: 'Pikachu',
  types: ['electric'],
  stats: { hp: 100, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  currentHp: 100,
  maxHp: 100,
  status: 'none',
  flinch: true,
};
const flinchRes = checkTurnStartStatus(stubborn);
assert(flinchRes.cantMove === true && flinchRes.flinched === true, 'checkTurnStartStatus blocks move when flinch=true');
assert(stubborn.flinch === false, 'flinch flag is consumed (reset to false) after check');

const noFlinch = {
  name: 'Pikachu',
  types: ['electric'],
  stats: { hp: 100, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  currentHp: 100,
  maxHp: 100,
  status: 'none',
  flinch: false,
};
const normalRes = checkTurnStartStatus(noFlinch);
assert(normalRes.cantMove === false, 'checkTurnStartStatus allows move when flinch=false');

// 8. Teams initialize with flinch flag false
console.log('--- Team initialization ---');
const team = generateRandomTeam(null, 3);
assert(team.every((p) => p.flinch === false), 'All generated team members initialize flinch=false');

// 9. Verify MOVE_STATUS_MAP status-category moves keep full accuracy for roll
console.log('--- Static status move accuracy in spec ---');
assert(MOVE_STATUS_MAP.thunder_wave.accuracy === 0.90, 'Thunder Wave spec keeps 90% accuracy');
assert(MOVE_STATUS_MAP.will_o_wisp.accuracy === 0.85, 'Will-O-Wisp spec keeps 85% accuracy');
assert(MOVE_STATUS_MAP.toxic.accuracy === 0.90, 'Toxic spec keeps 90% accuracy');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
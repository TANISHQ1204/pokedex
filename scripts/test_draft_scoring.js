import {
  baseStatTotal,
  teamScoreBreakdown,
  pickWinner,
  strongestPick,
  weakestPick,
  TYPE_COVERAGE_BONUS,
  RARE_BONUS,
  SHINY_BONUS,
} from '../src/game/mysteryDraft.js';

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

console.log('--- RUNNING DRAFT WINNER-SCORING TESTS ---');

// 1. baseStatTotal sums the six base stats
const sample = {
  name: 'Blastoise',
  stats: { hp: 79, attack: 83, defense: 100, specialAttack: 85, specialDefense: 105, speed: 78 },
};
assert(baseStatTotal(sample) === 530, `baseStatTotal sums 6 stats (got ${baseStatTotal(sample)}, expected 530)`);
assert(baseStatTotal({}) === 0, 'baseStatTotal returns 0 when stats are missing');

// 2. teamScoreBreakdown components
const mkEntry = ({ id = 1, stats, rarer = false, shiny = false, types = ['water'] }) => ({
  id,
  name: `pkmn-${id}`,
  bst: Object.values(stats).reduce((a, b) => a + b, 0),
  rarer,
  variant: shiny ? 'shiny' : 'normal',
  types,
});

const p1a = mkEntry({ id: 9, stats: { hp: 79, attack: 83, defense: 100, specialAttack: 85, specialDefense: 105, speed: 78 }, types: ['water'] }); // 530
const p1b = mkEntry({ id: 6, stats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 }, rarer: false, types: ['fire', 'flying'] }); // 534
const p2a = mkEntry({ id: 1, stats: { hp: 45, attack: 49, defense: 49, specialAttack: 65, specialDefense: 65, speed: 45 }, rarer: true, shiny: true, types: ['grass', 'poison'] }); // 318

const player1 = { id: 0, name: 'Ash', won: [p1a, p1b] };
const player2 = { id: 1, name: 'Brock', won: [p2a] };

const s1 = teamScoreBreakdown(player1);
assert(s1.bst === 1064, `player1 total BST = 1064 (got ${s1.bst})`);
assert(s1.typeCoverage === 3, `player1 covers 3 distinct types (water/fire/flying -> got ${s1.typeCoverage})`);
assert(s1.typeBonus === 3 * TYPE_COVERAGE_BONUS, `player1 type bonus uses TYPE_COVERAGE_BONUS`);
assert(s1.rareBonus === 0 && s1.shinyBonus === 0, 'player1 has no rare/shiny bonus');

const s2 = teamScoreBreakdown(player2);
assert(s2.rareBonus === RARE_BONUS, `player2 rare bonus = ${RARE_BONUS}`);
assert(s2.shinyBonus === SHINY_BONUS, `player2 shiny bonus = ${SHINY_BONUS}`);
assert(s2.typeCoverage === 2, `player2 covers 2 distinct types (grass/poison)`);

// 3. Winner is decided by whole-team score (not budget!)
const winner = pickWinner([player1, player2]);
assert(winner && winner.id === 0, 'winner is the stronger team by combined score, ignoring leftover budget');

// 4. Tie-break by rares
const pAl = { id: 0, name: 'A', won: [mkEntry({ id: 1, stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 } })] }; // 600
const pBl = { id: 1, name: 'B', won: [mkEntry({ id: 2, stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 } })] }; // 600
assert(pickWinner([pAl, pBl]) === null, 'identical teams -> true draw (null), all tiebreaks exhausted');

const pA2 = { id: 0, name: 'A', won: [mkEntry({ id: 1, stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 } })] };
const pB2 = { id: 1, name: 'B', won: [mkEntry({ id: 2, stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 }, rarer: true })] };
const tieWinner = pickWinner([pA2, pB2]);
assert(tieWinner && tieWinner.id === 1, 'equal score -> team with more rares wins');

// 5. strongestPick / weakestPick
const str = strongestPick(player1);
const wk = weakestPick(player1);
assert(str && str.entry.id === 6, 'strongestPick returns highest-BST Pokemon (Charizard id 6)');
assert(wk && wk.entry.id === 9, 'weakestPick returns lowest-BST Pokemon (Blastoise id 9)');
assert(strongestPick({ won: [] }) === null, 'strongestPick with empty team returns null');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
else process.exit(0);
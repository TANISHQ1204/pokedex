import {
  baseStatTotal,
  teamScoreBreakdown,
  pickWinner,
  strongestPick,
  weakestPick,
  pkmnScore,
  pkmnMultiplier,
  RARE_MULTIPLIER,
  SHINY_MULTIPLIER,
  FORM_MULTIPLIER,
  createSession,
  settleAuction,
  superlatives,
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

// 2. Per-Pokemon multipliers stack multiplicatively
assert(pkmnMultiplier({ bst: 600 }) === 1, 'normal Pokemon multiplier = 1');
assert(pkmnMultiplier({ bst: 600, rarer: true }) === RARE_MULTIPLIER, 'rarer multiplier applies alone');
assert(pkmnMultiplier({ bst: 600, variant: 'shiny' }) === SHINY_MULTIPLIER, 'shiny multiplier applies alone');
assert(pkmnMultiplier({ bst: 600, formKind: 'regional' }) === FORM_MULTIPLIER, 'form multiplier applies alone');
const stacked = RARE_MULTIPLIER * SHINY_MULTIPLIER * FORM_MULTIPLIER;
assert(pkmnMultiplier({ bst: 600, rarer: true, variant: 'shiny', formKind: 'mega' }) === stacked,
  `shiny+rare+form stack multiplicatively (${pkmnMultiplier({ bst: 600, rarer: true, variant: 'shiny', formKind: 'mega' })} = ${stacked})`);

assert(pkmnScore({ bst: 600 }) === 600, 'score = BST when no modifiers');
assert(pkmnScore({ bst: 600, rarer: true }) === Math.round(600 * RARE_MULTIPLIER), 'rare score scaled');
assert(pkmnScore({ bst: 530, rarer: true, variant: 'shiny', formKind: 'form' }) === Math.round(530 * stacked),
  `fully-stacked score rounds to ${Math.round(530 * stacked)}`);

// 3. teamScoreBreakdown: raw BST is separate from the scored total
const mkEntry = ({ id = 1, bst, rarer = false, shiny = false, formKind = null, types = ['water'], paid }) => ({
  id,
  name: `pkmn-${id}`,
  display: `Pkmn ${id}`,
  dexNo: id,
  bst,
  rarer,
  variant: shiny ? 'shiny' : 'normal',
  formKind,
  types,
  ...(paid !== undefined ? { paid } : {}),
});

const p1a = mkEntry({ id: 9, bst: 530, types: ['water'] });
const p1b = mkEntry({ id: 6, bst: 534, rarer: true, types: ['fire', 'flying'] }); // 534 * 1.5 = 801
const p2a = mkEntry({ id: 1, bst: 318, rarer: true, shiny: true, formKind: 'mega', types: ['grass', 'poison'] }); // 318*1.98=629.64→630

const player1 = { id: 0, name: 'Ash', won: [p1a, p1b] };
const player2 = { id: 1, name: 'Brock', won: [p2a] };

const s1 = teamScoreBreakdown(player1);
assert(s1.bst === 1064, `player1 raw BST = 1064 (got ${s1.bst})`);
assert(s1.total === 530 + Math.round(534 * RARE_MULTIPLIER), `player1 scored total = 530 + 801 (got ${s1.total})`);
assert(s1.typeCoverage === 3, `player1 covers 3 distinct types (water/fire/flying -> got ${s1.typeCoverage})`);
assert(s1.rare === 1 && s1.shiny === 0 && s1.forms === 0, 'player1 counts 1 rare, 0 shiny, 0 forms');
assert(s1.perPokemon.length === 2, 'breakdown lists every Pokemon');
assert(s1.perPokemon[1].mult === RARE_MULTIPLIER && s1.perPokemon[1].score === 801, 'per-Pokemon multiplier + score shown');

const s2 = teamScoreBreakdown(player2);
assert(s2.rare === 1 && s2.shiny === 1 && s2.forms === 1, `player2 counts 1 rare + 1 shiny + 1 form`);
assert(s2.total === Math.round(318 * RARE_MULTIPLIER * SHINY_MULTIPLIER * FORM_MULTIPLIER), `player2 total uses stacked multipliers (got ${s2.total})`);
assert(s2.typeCoverage === 2, `player2 covers 2 distinct types (grass/poison)`);

// 4. Winner is decided by scored total (not budget, not raw BST)
assert(pickWinner([player1, player2])?.id === 0, 'player1 (higher scored total) wins, ignoring leftover budget');

// 5. Exact-equal totals are always a true draw — even with different raw BST
const drawA = { id: 0, name: 'A', won: [mkEntry({ id: 1, bst: 600, types: ['normal'] })] }; // 600
const drawB = { id: 1, name: 'B', won: [mkEntry({ id: 2, bst: 500, shiny: true, types: ['normal'] })] }; // 600
assert(pickWinner([drawA, drawB]) === null, `identical totals (both ${pkmnScore(drawA.won[0])}) -> true draw (null)`);
const rareWin = { id: 1, name: 'B', won: [mkEntry({ id: 2, bst: 600, rarer: true, types: ['normal'] })] };
const notTie = pickWinner([drawA, rareWin]);
assert(notTie && notTie.id === 1, 'equal raw BST but a MULTIPLIER breaks the tie (600 vs 900)');
assert(pickWinner([player1])?.id === 0, 'single-player session is its own winner');
assert(pickWinner([drawA, drawA]) === null, 'two identical teams -> draw');

// 6. strongestPick / weakestPick (raw-BST helpers for MVP badges)
const str = strongestPick(player1);
const wk = weakestPick(player1);
assert(str && str.entry.id === 6, 'strongestPick returns highest raw-BST Pokemon (id 6)');
assert(wk && wk.entry.id === 9, 'weakestPick returns lowest raw-BST Pokemon (id 9)');
assert(strongestPick({ won: [] }) === null, 'strongestPick with empty team returns null');

// 7. settleAuction stamps `paid` on won entries (for Best Value)
{
  const queue = [mkEntry({ id: 5, bst: 400, types: ['fire'] })];
  const st = createSession({ playerNames: ['A', 'B'], budget: 100, queue, blind: false });
  const won = settleAuction(st, { winnerId: 0, amount: 20 });
  assert(won.error === null, 'auction settled for $20');
  assert(won.players[0].won[0].paid === 20, `won entry stamped paid=20 (got ${won.players[0].won[0].paid})`);
  assert(won.players[0].won[0].bst === 400, 'stamping paid does not clobber entry fields');
  const noSale = settleAuction(st, { winnerId: null, amount: 0 });
  assert(noSale.players.every((p) => p.won.length === 0), 'no-sale stamps nothing (nobody won)');
}

// 8. Superlatives: strongest, best value, most legendaries, best coverage
{
  const teamA = {
    id: 0,
    name: 'Alice',
    won: [
      mkEntry({ id: 1, bst: 700, rarer: true, types: ['dragon', 'flying'], paid: 500 }),
      mkEntry({ id: 2, bst: 100, types: ['electric'], paid: 0 }),
      mkEntry({ id: 3, bst: 300, rarer: true, types: ['water'], paid: 100 }),
    ],
  };
  const teamB = {
    id: 1,
    name: 'Bob',
    won: [
      mkEntry({ id: 4, bst: 400, rarer: true, shiny: true, formKind: 'mega', types: ['probably fake'], paid: 200 }),
      mkEntry({ id: 5, bst: 300, types: ['poison'], paid: 0 }),
      mkEntry({ id: 6, bst: 600, types: ['grass'], paid: 50 }),
    ],
  };
  const sup = superlatives([teamA, teamB]);

  assert(sup.strongest && sup.strongest.entry.id === 1, 'strongest is the highest SCORED Pokemon (rare id 1 = 1050 pts)');
  assert(sup.valuePick && sup.valuePick.entry.id === 5, '$0 freebie beats any paid pick for value');
  // among free picks, higher BST wins: teamA id2 (100) < teamB id5 (300)
  const freeOnly = superlatives([
    { id: 0, name: 'A', won: [mkEntry({ id: 9, bst: 100, paid: 0 }), mkEntry({ id: 10, bst: 250, paid: 0 })] },
    { id: 1, name: 'B', won: [mkEntry({ id: 11, bst: 200, paid: 100 })] },
  ]);
  assert(freeOnly.valuePick.entry.id === 10, 'among $0 picks, higher BST wins');
  const paidOnly = superlatives([
    { id: 0, name: 'A', won: [mkEntry({ id: 20, bst: 500, paid: 500 })] },
    { id: 1, name: 'B', won: [mkEntry({ id: 21, bst: 400, paid: 200 })] },
  ]);
  assert(paidOnly.valuePick.entry.id === 21, 'paid picks compare bst/cost (400/200 beats 500/500)');

  assert(sup.mostLegendaries.player.id === 0, 'Alice has the most Legendary/Mythical Pokemon');
  assert(sup.mostLegendaries.count === 2, `mostLegendaries count = 2 (got ${sup.mostLegendaries.count})`);

  const coverage = superlatives([
    { id: 0, name: 'A', won: [mkEntry({ id: 1, bst: 100, types: ['fire', 'grass'] }), mkEntry({ id: 2, bst: 100, types: ['water'] })] },
    { id: 1, name: 'B', won: [mkEntry({ id: 3, bst: 100, types: ['normal'] })] },
  ]);
  assert(coverage.bestCoverage.player.id === 0, 'Alice has the best type coverage');
  assert(coverage.bestCoverage.count === 3, `coverage count = 3 distinct types (got ${coverage.bestCoverage.count})`);

  const emptySup = superlatives([{ id: 0, name: 'A', won: [] }, { id: 1, name: 'B', won: [] }]);
  assert(emptySup.strongest === null && emptySup.valuePick === null, 'empty session has null superlatives');
}

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
else process.exit(0);
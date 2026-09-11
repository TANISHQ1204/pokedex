// End-to-end superlatives test: runs scripted Mystery Draft sessions and
// verifies the fun end-screen category awards are computed correctly.
import pokemonList from '../src/data/pokemon.json' with { type: 'json' };
import speciesMeta from '../src/data/speciesMeta.json' with { type: 'json' };
import formsList from '../src/data/forms.json' with { type: 'json' };
import {
  createSession,
  draftQueue,
  nextActor,
  revealAttribute,
  settleAuction,
  superlatives,
  pkmnScore,
} from '../src/game/mysteryDraft.js';

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`  ❌ ${msg}`);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

// Run one scripted session. `mode` controls who wins and what they pay:
//  - 'alternate-free': A pays $10/mon, B pays $0 (free) — exercises value picks
//  - 'alternate-paid': both pay positive amounts — no freebies to inflate value
function scriptedSession(mode) {
  const rng = seededRandom(mode === 'free' ? 777 : 31337);
  const queue = draftQueue(pokemonList, formsList, speciesMeta, 9, 12, rng);
  let state = createSession({ playerNames: ['Ash', 'Brock'], budget: 1000, queue, blind: true });
  let guard = 0;
  while (state.status !== 'summary' && guard++ < 50) {
    if (state.status === 'reveal') {
      const actor = nextActor(state);
      if (!actor) {
        failures++;
        console.error('  ❌ reveal deadlock');
        state = { ...state, status: 'bid' };
        continue;
      }
      state = revealAttribute(state, actor.playerId, actor.available[0]);
    } else {
      const winnerId = state.queueIndex % 2; // Ash leads evens, Brock leads odds
      const amount =
        mode === 'free'
          ? winnerId === 0
            ? Math.min(10, state.players[0].budget)
            : 0
          : 10 + winnerId;
      state = settleAuction(state, { winnerId, amount });
    }
  }
  return state;
}

console.log('--- Superlatives: alternate-free session ($10 vs $0 bids) ---');
{
  const state = scriptedSession('free');
  check(state.status === 'summary', 'session completes');
  check(state.players.every((p) => p.won.length === 6), 'each player won exactly 6 Pokemon');
  check(
    state.players.every((p) => p.won.every((e) => typeof e.paid === 'number')),
    'every won entry is stamped with its paid amount'
  );
  check(state.players[0].won.every((e) => e.paid === 10), 'Ash paid $10 for every win');
  check(state.players[1].won.every((e) => e.paid === 0), 'Brock won every auction for free');

  const sup = superlatives(state.players);
  check(sup.strongest && sup.strongest.entry, 'Strongest Single Pokemon awarded');
  const maxScore = Math.max(...state.players.flatMap((p) => p.won).map((e) => pkmnScore(e)));
  check(sup.strongest.score === maxScore, `strongest score equals the true max (${maxScore})`);

  check(sup.valuePick && sup.valuePick.entry, 'Best Value Pick awarded');
  check(sup.valuePick.entry.paid === 0, 'Best Value is a $0 freebie (infinite value)');
  const freebies = state.players.flatMap((p) => p.won).filter((e) => e.paid === 0);
  check(
    sup.valuePick.entry.bst === Math.max(...freebies.map((e) => e.bst)),
    'Best Value freebie has the highest BST among free picks'
  );

  check(sup.mostLegendaries && state.players.includes(sup.mostLegendaries.player), 'Most Legendaries points at a real player');
  check(sup.bestCoverage && state.players.includes(sup.bestCoverage.player), 'Best Coverage points at a real player');
  const coverageTotal = state.players.flatMap((p) => p.won).reduce((s, e) => s + e.types.length, 0);
  check(sup.bestCoverage.count >= 1 && sup.bestCoverage.count <= coverageTotal, 'Best Coverage count is sane');
}

console.log('--- Superlatives: both players pay (no freebies) ---');
{
  const state = scriptedSession('paid');
  check(state.status === 'summary', 'session completes');
  const sup = superlatives(state.players);
  check(sup.valuePick && sup.valuePick.entry, 'Best Value Pick awarded even without freebies');
  check(sup.valuePick.entry.paid > 0, 'Best Value with no freebies is a paid pick');
  const paidEntries = state.players.flatMap((p) => p.won);
  const bestRatio = Math.max(...paidEntries.map((e) => e.bst / e.paid));
  check(
    Math.abs(sup.valuePick.entry.bst / sup.valuePick.entry.paid - bestRatio) < 1e-9,
    'Best Value maximizes bst/cost among paid picks'
  );
}

console.log('--- Superlatives: empty teams ---');
{
  const sup = superlatives([
    { id: 0, name: 'A', won: [] },
    { id: 1, name: 'B', won: [] },
  ]);
  check(sup.strongest === null, 'no strongest when nobody drafted');
  check(sup.valuePick === null, 'no value pick when nobody drafted');
  check(sup.mostLegendaries === null, 'no most-legendaries when nobody drafted');
  check(sup.bestCoverage === null, 'no coverage when nobody drafted');
}

console.log(failures === 0 ? '\nSUPERLATIVES TESTS PASSED ✅' : `\n${failures} FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
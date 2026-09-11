import pokemonList from '../src/data/pokemon.json' with { type: 'json' };
import speciesMeta from '../src/data/speciesMeta.json' with { type: 'json' };
import formsList from '../src/data/forms.json' with { type: 'json' };
import {
  ATTRIBUTE_IDS,
  MAX_TEAM_SIZE,
  createSession,
  draftQueue,
  getEligiblePool,
  nextActor,
  revealAttribute,
  settleAuction,
} from '../src/game/mysteryDraft.js';

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`  ❌ ${msg}`);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

// Seeded RNG for reproducibility
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

console.log('--- Pool eligibility test ---');
// Base species count <= gen 3 is 386; the pool also includes alternate forms
// whose OWN debut generation is <= 3 (Deoxys/Castform forms).
const pool3EligibleForms = formsList.filter((f) => f.generation <= 3).length;
const pool3 = getEligiblePool(pokemonList, formsList, speciesMeta, 3);
const pool9 = getEligiblePool(pokemonList, formsList, speciesMeta, 9);
check(pool3.length === 386 + pool3EligibleForms, `Gen 3 pool = 386 + ${pool3EligibleForms} forms (got ${pool3.length})`);
check(pool3EligibleForms === 6, `Gen 3 has 6 eligible forms (Deoxys + Castform, got ${pool3EligibleForms})`);
check(pool3.filter((p) => p.id > 1025).every((f) => f.generation <= 3), 'Gen 3 pool only contains gen<=3 forms');
check(pool3.filter((p) => p.id <= 1025).every((p) => p.id <= 386), 'Gen 3 pool only contains #1-386 bases');
check(pool9.length === 1025 + formsList.length, `Gen 9 pool = 1025 + ${formsList.length} forms (got ${pool9.length})`);
check(pool9.every((p) => p.id >= 1 && (p.id <= 1025 || p.id >= 1026)), 'Gen 9 pool spans full dex + forms');

// Generational coverage of forms: Gen 5 must have NO megas/primals, Gen 6 has all.
const gen5 = getEligiblePool(pokemonList, formsList, speciesMeta, 5);
const gen6 = getEligiblePool(pokemonList, formsList, speciesMeta, 6);
check(gen5.every((f) => !(f.kind === 'mega' || f.kind === 'primal')), 'No megas/primals eligible before Gen 6');
check(gen6.some((f) => f.kind === 'mega') && gen6.some((f) => f.kind === 'primal'), 'Gen 6 pool includes megas + primals');

console.log('--- Draft tests ---');
const rng = seededRandom(42);
const queue = draftQueue(pokemonList, formsList, speciesMeta, 3, 12, rng);
check(queue.length === 12, `Drafted 12 Pokemon (got ${queue.length})`);
check(queue.every((e) => e.dexNo <= 386 && e.generation <= 3), 'All drafted within Gen 3');
check(new Set(queue.map((e) => e.dexNo)).size === 12, 'Drafted Pokemon have 12 unique base species (no dup species)');
queue.forEach((e) => {
  check(
    typeof e.name === 'string' && e.name.length > 0,
    `Entry ${e.id} has name`
  );
  check(typeof e.display === 'string' && e.display.length > 0, `Entry ${e.id} has display (${e.display})`);
  check(Number.isInteger(e.dexNo) && e.dexNo >= 1, `Entry ${e.id} has dexNo (${e.dexNo})`);
  check(typeof e.color === 'string' && e.color.length > 0, `Entry ${e.id} has color (${e.color})`);
  check(Number.isInteger(e.generation) && e.generation >= 1, `Entry ${e.id} has generation`);
  check(typeof e.genus === 'string' && e.genus.length > 0, `Entry ${e.id} has species/genus (${e.genus})`);
  check(Array.isArray(e.types) && e.types.length > 0, `Entry ${e.id} has types`);
  check(e.variant === 'normal' || e.variant === 'shiny', `Entry ${e.id} has variant`);
});
const shinyCount = queue.filter((e) => e.variant === 'shiny').length;
console.log(`  (shiny count in queue: ${shinyCount})`);
check(queue.every((e) => e.sprite.startsWith('http')), 'All entries have a sprite URL');

console.log('--- Forms pool integration ---');
const q9 = draftQueue(pokemonList, formsList, speciesMeta, 9, 24, rng);
const draftForms = q9.filter((e) => e.formKind);
check(draftForms.length > 0, `Gen 9 draft pulls alternate forms (got ${draftForms.length} of 24)`);
draftForms.forEach((e) => {
  check(Number.isInteger(e.id) && e.id > 1025, `Form entry has resource id > 1025 (${e.id})`);
  check(e.dexNo === e.dexNo && e.dexNo >= 1 && e.dexNo <= 1025, `Form entry dexNo points at its base species (#${e.dexNo})`);
  check(['mega', 'primal', 'regional', 'gmax', 'totem', 'form'].includes(e.formKind), `Form entry has valid kind (${e.formKind})`);
});

console.log('--- Full session simulation (12 Pokemon, budget 500) ---');
let state = createSession({
  playerNames: ['Alice', 'Bob'],
  budget: 500,
  queue: draftQueue(pokemonList, formsList, speciesMeta, 9, 12, rng),
});
let revealLog = [];
let auctionLog = [];

while (state.status !== 'summary') {
  if (state.status === 'reveal') {
    // Exactly one actor may reveal, then it is auction time.
    const actor = nextActor(state);
    check(actor !== null, 'Reveal phase has an active player (no deadlock)');
    if (!actor) {
      state = { ...state, status: 'bid' };
      continue;
    }
    const attr = actor.available[Math.floor(rng() * actor.available.length)];
    const next = revealAttribute(state, actor.playerId, attr);
    check(next.status === 'bid', `Reveal for Pokemon #${state.queueIndex + 1} moves straight to auction`);
    revealLog.push({ poke: state.queueIndex, player: state.players[actor.playerId].name, attr });
    state = next;
  } else if (state.status === 'bid') {
    // Arbitrator picks an eligible winner (team not full yet) or no-sale.
    const eligible = state.players.filter((p) => p.won.length < MAX_TEAM_SIZE);
    const winnerId =
      eligible.length > 0 && rng() < 0.85
        ? eligible[Math.floor(rng() * eligible.length)].id
        : null;
    let amount = 0;
    if (winnerId !== null) {
      amount = Math.floor(rng() * (state.players[winnerId].budget + 1));
    }
    const next = settleAuction(state, { winnerId, amount });
    check(next.error === null, `Auction #${state.queueIndex + 1} settled without error`);
    if (winnerId !== null) {
      auctionLog.push({
        poke: state.queueIndex,
        winner: state.players[winnerId].name,
        amount,
      });
    }
    state = next;
  }
}

console.log('--- Final state assertions ---');
check(state.status === 'summary', 'Session ends in summary status');
check(state.queueIndex === 12, 'All 12 Pokemon processed');
const totalWon = state.players.reduce((s, p) => s + p.won.length, 0);
check(totalWon === auctionLog.length, 'Every recorded win was awarded');
check(
  state.players.every((p) => p.won.length <= MAX_TEAM_SIZE),
  `No player exceeds the ${MAX_TEAM_SIZE}-Pokemon team cap`
);
check(
  state.players.every((p) => p.budget >= 0),
  'No player budget went negative'
);
check(
  state.players.every((p) => new Set(p.usedTokens).size === p.usedTokens.length),
  'No player used the same attribute token twice'
);
check(
  state.players.every((p) => p.usedTokens.length === ATTRIBUTE_IDS.length),
  'Both players spent all 6 tokens by the end'
);

console.log('--- Budget arithmetic check ---');
state.players.forEach((p) => {
  const sumBids = auctionLog
    .filter((a) => a.winner === p.name)
    .reduce((s, a) => s + a.amount, 0);
  check(500 - p.budget === sumBids, `${p.name}: budget deduction equals sum of winning bids (${sumBids})`);
  check(p.budget + sumBids === 500, `${p.name}: final budget + spent = starting budget`);
});

console.log('--- One reveal per Pokemon, alternating revealer ---');
check(revealLog.length === 12, `Exactly 12 clues revealed (got ${revealLog.length})`);
const revealsByPokemon = {};
revealLog.forEach((r) => {
  revealsByPokemon[r.poke] = revealsByPokemon[r.poke] || [];
  revealsByPokemon[r.poke].push(r);
});
check(
  Object.keys(revealsByPokemon).length === 12 && Object.values(revealsByPokemon).every((v) => v.length === 1),
  'Each of the 12 Pokemon got exactly ONE clue'
);
revealLog.forEach((r) => {
  const expected = r.poke % 2 === 0 ? 'Alice' : 'Bob';
  check(r.player === expected, `Pokemon #${r.poke + 1} clue revealed by ${expected} (got ${r.player})`);
});
const perPlayer = { Alice: 0, Bob: 0 };
revealLog.forEach((r) => perPlayer[r.player]++);
check(perPlayer.Alice === 6 && perPlayer.Bob === 6, 'Each player revealed exactly 6 clues (A,B,A,B... across the session)');

console.log('--- Boundary: team-full player cannot win ---');
const capSt = createSession({
  playerNames: ['X', 'Y'],
  budget: 50,
  queue: draftQueue(pokemonList, formsList, speciesMeta, 1, 12, rng),
});
const fullTeam0 = {
  ...capSt,
  status: 'bid',
  players: capSt.players.map((p) =>
    p.id === 0 ? { ...p, won: capSt.queue.slice(0, MAX_TEAM_SIZE) } : p
  ),
};
const rejectedFull = settleAuction(fullTeam0, { winnerId: 0, amount: 5 });
check(rejectedFull.error !== null, 'Team-full player rejected as winner');
check(rejectedFull.queueIndex === 0, 'Rejected team-full award does not advance queue');
check(rejectedFull.players[0].budget === 50, 'Rejected team-full award does not charge budget');
const otherWins = settleAuction(fullTeam0, { winnerId: 1, amount: 5 });
check(otherWins.error === null, 'Other player can still win when one team is full');
check(otherWins.players[1].won.length === 1, 'Other player awarded the Pokemon');

console.log('--- Boundary: $0 (free) bid is allowed ---');
const zeroSt = { ...capSt, status: 'bid' };
const zeroBid = settleAuction(zeroSt, { winnerId: 0, amount: 0 });
check(zeroBid.error === null, '$0 bid accepted');
check(zeroBid.players[0].won.length === 1, '$0 bid awards the Pokemon');
check(zeroBid.players[0].budget === 50, '$0 bid leaves budget unchanged');

console.log('--- Boundary: settle with bid exceeding budget is rejected ---');
const stBid = { ...capSt, status: 'bid' };
const rejected = settleAuction(stBid, { winnerId: 0, amount: 51 });
check(rejected.error !== null, 'Bid > budget rejected');
check(rejected.players[0].budget === 50, 'Rejected bid leaves budget unchanged');
check(rejected.queueIndex === 0, 'Rejected bid does not advance queue');
const okBid = settleAuction(stBid, { winnerId: 1, amount: 50 });
check(okBid.error === null, 'Bid == budget accepted');
check(okBid.players[1].budget === 0, 'Budget clamps at exactly 0 (never negative)');

console.log('--- Boundary: designated revealer without tokens is skipped (straight to auction) ---');
const emptyState = createSession({
  playerNames: ['A', 'B'],
  budget: 100,
  queue,
});
const exhaustedA = emptyState.players.map((p) =>
  p.id === 0 ? { ...p, usedTokens: [...ATTRIBUTE_IDS] } : p
);
const noTokensForA = {
  ...emptyState,
  players: exhaustedA,
  nextPointer: 0,
  status: 'reveal',
};
check(nextActor(noTokensForA) === null, 'No actor when the designated player (A) is exhausted — A cannot reveal for that Pokemon');
const afterSettle = settleAuction(
  { ...noTokensForA, status: 'bid' },
  { winnerId: 0, amount: 10 }
);
check(afterSettle.nextPointer === 1, 'Skipped Pokemon still alternates the revealer for the next one');
check(afterSettle.status === 'reveal', 'Next Pokemon (by the other player) opens immediately to reveal');

console.log('--- Boundary: no-sale advances without awarding ---');
const ns = settleAuction({ ...noTokensForA, status: 'bid' }, { winnerId: null, amount: 0 });
check(ns.players.every((p) => p.won.length === 0), 'No-sale awards nothing');
check(ns.queueIndex === 1, 'No-sale still advances queue');
check(ns.lastResult.noSale === true, 'No-sale flagged in lastResult');

console.log(failures === 0 ? '\nALL TESTS PASSED ✅' : `\n${failures} FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
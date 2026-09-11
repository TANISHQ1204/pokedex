import pokemonList from '../src/data/pokemon.json' with { type: 'json' };
import speciesMeta from '../src/data/speciesMeta.json' with { type: 'json' };
import formsList from '../src/data/forms.json' with { type: 'json' };
import {
  createSession,
  draftQueue,
  getEligiblePool,
  revealAttribute,
  settleAuction,
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
    console.error('  FAIL:', msg);
  }
}

console.log(`Pool sanity: all gens eligible ${getEligiblePool(pokemonList, formsList, speciesMeta, 9).length}`);

for (let run = 0; run < 2000; run++) {
  const rng = seededRandom(run * 7919 + 13);
  const maxGen = 1 + Math.floor(rng() * 9);
  const budget = 50 + Math.floor(rng() * 2000);
  const queue = draftQueue(pokemonList, formsList, speciesMeta, maxGen, 12, rng);
  let state = createSession({ playerNames: ['A', 'B'], budget, queue });

  const revealCountTotal = { 0: 0, 1: 0 };
  let guard = 0;

  while (state.status !== 'summary' && guard++ < 200) {
    if (state.status === 'reveal') {
      const actorIdx = state.queueIndex % 2; // revealers alternate A, B, A, B, ...
      const actorNext = (() => {
        const p = state.players[state.nextPointer];
        return p && p.usedTokens.length < 6 ? { playerId: p.id } : null;
      })();
      if (!actorNext) {
        failures++;
        console.error(`[run ${run}] reveal phase deadlocked at poke ${state.queueIndex}`);
        break;
      }
      if (actorNext.playerId !== actorIdx) {
        failures++;
        console.error(`[run ${run}] poker ${state.queueIndex} expected actor ${actorIdx}, got ${actorNext.playerId}`);
      }
      const actorMore = state.players[actorNext.playerId];
      const available = ['name', 'color', 'generation', 'number', 'types', 'species'].filter(
        (t) => !actorMore.usedTokens.includes(t)
      );
      const attr = available[Math.floor(rng() * available.length)];
      const next = revealAttribute(state, actorNext.playerId, attr);
      if (next.error) {
        failures++;
        console.error('[run] reveal error', next.error);
      }
      if (next.status !== 'bid') {
        failures++;
        console.error(`[run] after one reveal expected bid, got ${next.status}`);
      }
      revealCountTotal[actorNext.playerId]++;
      state = next;
    } else if (state.status === 'bid') {
      const eligible = state.players.filter((p) => p.won.length < 6);
      const winnerId = eligible.length > 0 && rng() < 0.85
        ? eligible[Math.floor(rng() * eligible.length)].id
        : null;
      let amount = 0;
      if (winnerId !== null) {
        amount = Math.floor(rng() * (state.players[winnerId].budget + 1));
      }
      const next = settleAuction(state, { winnerId, amount });
      if (next.error) {
        failures++;
        console.error('[run] settle error', next.error);
        state = { ...next, status: 'bid' };
        continue;
      }
      state = next;
    } else {
      failures++;
      console.error('[run] unexpected status', state.status);
      break;
    }
  }

  if (state.status !== 'summary') {
    failures++;
    console.error(`[run ${run}] did not reach summary (status ${state.status}, idx ${state.queueIndex})`);
  }
  if (revealCountTotal[0] !== 6) failures++;
  if (revealCountTotal[1] !== 6) failures++;
  if (state.players.some((p) => p.budget < 0)) failures++;
  if (state.players.some((p) => p.won.length > 6)) failures++;
  state.players.forEach((p) => {
    if (new Set(p.usedTokens).size !== p.usedTokens.length) failures++;
    if (p.usedTokens.some((t) => !['name', 'color', 'generation', 'number', 'types', 'species'].includes(t))) failures++;
    if (p.usedTokens.length !== 6) failures++;
  });
}

console.log('--- Expected flow trace (no-sale never, $0 bids, Gen 9) ---');
{
  const rng = seededRandom(12345);
  const queue = draftQueue(pokemonList, formsList, speciesMeta, 9, 12, rng);
  let state = createSession({ playerNames: ['A', 'B'], budget: 500, queue });
  const perPoke = [];
  let leadOrder = [];
  while (state.status !== 'summary') {
    if (state.status === 'reveal') {
      const actor = state.players[state.nextPointer];
      if (perPoke[state.queueIndex] === undefined) {
        leadOrder.push(actor.name);
      }
      perPoke[state.queueIndex] = (perPoke[state.queueIndex] || 0) + 1;
      const available = ['name', 'color', 'generation', 'number', 'types', 'species'].filter(
        (t) => !actor.usedTokens.includes(t)
      );
      state = revealAttribute(state, actor.id, available[0]);
    } else {
      state = settleAuction(state, { winnerId: state.queueIndex % 2, amount: 0 });
    }
  }
  const expected = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1 };
  const ok = Object.keys(expected).every((k) => perPoke[k] === expected[k]);
  check(ok, `every Pokemon got exactly 1 reveal (got ${JSON.stringify(perPoke)})`);
  console.log(`Lead order per Pokemon: ${leadOrder.join(', ')} (expect A,B alternating)`);
  check(
    leadOrder.every((n, i) => n === (i % 2 === 0 ? 'A' : 'B')),
    'First revealer alternates between Pokemon (A,B,A,B...)'
  );
  check(
    state.players.every((p) => p.usedTokens.length === 6),
    'Each player spent exactly 6 tokens across the session'
  );
}

console.log(failures === 0 ? 'STRESS TEST PASSED (2000 sessions + flow trace) ✅' : `${failures} FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
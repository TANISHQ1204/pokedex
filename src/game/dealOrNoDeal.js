// Pure local-state logic for the "Deal or No Deal" party game mode.
// No Supabase, no persistence — everything lives in React component state.
//
// Every round shows 6 CLOSED Pokeballs that share one theme (Generation, Color,
// or Legendary/Mythical). Players claim one ball each (mystery until opened),
// then each gets ONE deal: keep the revealed Pokemon, or swap it for a different
// remaining closed ball (the one they give up is burned). Round action order flips
// each round: Round 1 = A pick, B pick, B deal, A deal; Round 2 = B,A,A,B; etc.
// After 6 rounds both players own a 6-Pokemon team and the draft-style winner
// summary (shared with Mystery Draft) decides the champion.
//
// All Pokemon (base species, legendaries, mythicals, alternate forms) have equal
// uniform random chance. No Pokemon repeats across all 6 rounds (36 unique).

import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };
import formsList from '../data/forms.json' with { type: 'json' };
import speciesMeta from '../data/speciesMeta.json' with { type: 'json' };
import { enrichEntry, enrichFormEntry, entryGeneration, SHINY_CHANCE } from './mysteryDraft.js';

export const ROUNDS = 6;
export const BALLS_PER_SET = 6;

export const THEME_CATEGORIES = [
  { id: 'gen', label: 'Generation' },
  { id: 'color', label: 'Color' },
  { id: 'legend', label: 'Legendary / Mythical' },
];

function defaultRng() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xffffffff + 1);
}

function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function entryLabel(entry) {
  return entry.display || titleCase(entry.name);
}

function isForm(p) {
  return p.kind === 'form' || Number(p.id) >= 10001;
}

function getGen(p) {
  if (isForm(p)) return p.generation || 9;
  return entryGeneration(p, speciesMeta);
}

function getColor(p) {
  if (isForm(p)) return p.color || null;
  return (speciesMeta[p.id] || {}).color || null;
}

function isRarer(p) {
  if (isForm(p)) return !!p.rarer;
  return !!(speciesMeta[p.id] && speciesMeta[p.id].rarer);
}

function enrichPokemon(p, shiny) {
  if (isForm(p)) return enrichFormEntry(p, shiny);
  return enrichEntry(p, speciesMeta, shiny);
}

/**
 * Fisher-Yates shuffle a copy of the array using the provided RNG.
 * Returns the shuffled copy (does not mutate original).
 */
function shuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Merge base species + alternate forms into a single pool, filtered by maxGen.
 * Every Pokemon has equal uniform random chance — no weighting.
 */
function buildEligiblePool(maxGen) {
  const bases = defaultPokemonList.filter((p) => getGen(p) <= maxGen);
  const forms = formsList.filter((f) => getGen(f) <= maxGen);
  return [...bases, ...forms];
}

/**
 * Pick candidates for a given theme from the pool, excluding IDs in usedIds.
 * Returns the filtered candidates array (may be empty if theme is exhausted).
 */
function candidatesForTheme(category, pool, usedIds, rng) {
  const unused = pool.filter((p) => !usedIds.has(p.id));

  if (category === 'gen') {
    const gens = [...new Set(unused.map(getGen))].sort((a, b) => a - b);
    if (gens.length === 0) return { candidates: [], label: '' };
    const g = gens[Math.floor(rng() * gens.length)];
    return { candidates: unused.filter((p) => getGen(p) === g), label: `Gen ${g}` };
  }

  if (category === 'color') {
    const byColor = {};
    unused.forEach((p) => {
      const c = getColor(p);
      if (c) (byColor[c] = byColor[c] || []).push(p);
    });
    const keys = Object.keys(byColor).filter((c) => byColor[c].length >= BALLS_PER_SET);
    if (keys.length === 0) return { candidates: [], label: '' };
    const c = keys[Math.floor(rng() * keys.length)];
    return { candidates: byColor[c], label: titleCase(c) };
  }

  // legend
  const legendPool = unused.filter((p) => isRarer(p));
  return { candidates: legendPool, label: 'Legendary / Mythical' };
}

/**
 * Build one themed round set: 6 enriched entries sharing a common trait.
 * Includes base species AND alternate forms, all filtered by maxGen.
 * Excludes Pokemon IDs in usedIds to guarantee no duplicates across rounds.
 */
function buildThemedRound({ category, pool, usedIds, rng }) {
  let { candidates, label } = candidatesForTheme(category, pool, usedIds, rng);

  // Fallback: if the chosen theme has fewer than BALLS_PER_SET candidates
  // after exclusions, try all themes until one works.
  if (candidates.length < BALLS_PER_SET) {
    for (const alt of THEME_CATEGORIES) {
      const altResult = candidatesForTheme(alt.id, pool, usedIds, rng);
      if (altResult.candidates.length >= BALLS_PER_SET) {
        candidates = altResult.candidates;
        label = altResult.label;
        category = alt.id;
        break;
      }
    }
  }

  const shuffled = shuffle(candidates, rng);
  const entries = shuffled
    .slice(0, BALLS_PER_SET)
    .map((p) => enrichPokemon(p, rng() < SHINY_CHANCE));

  return { category, label, entries };
}

/**
 * Create a full session: all 6 themed rounds are prebuilt up front so the
 * session (and the whole playing state) stays plain JSON-serializable.
 * No Pokemon repeats across all 6 rounds (36 unique total).
 */
export function createSession({ playerNames, maxGen = 9, rng = defaultRng }) {
  const pool = buildEligiblePool(maxGen);
  const usedIds = new Set();
  const categories = THEME_CATEGORIES.map((c) => c.id);

  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    let category = categories[Math.floor(rng() * categories.length)];
    let round = buildThemedRound({ category, pool, usedIds, rng });

    // Mark all Pokemon in this round as used so they can't appear again
    round.entries.forEach((e) => usedIds.add(e.id));
    rounds.push(round);
  }

  const first = rounds[0];
  return {
    rounds,
    maxGen,
    round: 1,
    stepPos: 0,
    themeCategory: first.category,
    themeLabel: first.label,
    balls: first.entries.map((entry) => ({ entry, state: 'closed', ownerId: null })),
    players: playerNames.map((name, id) => ({
      id,
      name,
      won: [],
      pendingBall: null,
      burned: 0,
      lastAction: null,
    })),
    status: 'playing',
    error: null,
    lastResult: null,
  };
}

export function currentRound(session) {
  return session.rounds[(session.round - 1)] || null;
}

/**
 * Who acts at the current stepPos of the round.
 * Order flips each round: odd rounds A,B,B,A — even rounds B,A,A,B.
 */
export function stepActor(session) {
  if ((session.status !== 'playing' && session.status !== 'round_complete') || session.stepPos > 3) return null;
  const first = session.round % 2 === 1 ? 0 : 1;
  const second = 1 - first;
  const order = [first, second, second, first];
  return order[session.stepPos];
}

/** Claim a closed ball during the pick phase (reveals its Pokemon). */
export function pickBall(session, ballIndex) {
  if (session.status !== 'playing') return { ...session, error: 'The game is over.' };
  if (session.stepPos >= 2) {
    return { ...session, error: 'Both picks are in — time for the deals.' };
  }
  const actorId = stepActor(session);
  const actor = session.players[actorId];
  const target = session.balls[ballIndex];
  if (!target || target.state !== 'closed') {
    return { ...session, error: 'That Pokéball is spoken for — pick a closed one.' };
  }
  const balls = session.balls.map((b, i) => (i === ballIndex ? { ...b, state: 'pending', ownerId: actorId } : b));
  const players = session.players.map((p) => (p.id === actorId ? { ...p, pendingBall: ballIndex } : p));
  return { ...session, balls, players, stepPos: session.stepPos + 1, error: null, lastResult: `${actor.name} picked a mystery Pokéball…` };
}

/** Deal: lock in the revealed Pokemon as-is. */
export function dealKeep(session) {
  if (session.status !== 'playing' || session.stepPos < 2) {
    return { ...session, error: 'Both players need to pick their Pokéballs first.' };
  }
  const actorId = stepActor(session);
  const actor = session.players[actorId];
  const ballIndex = actor.pendingBall;
  if (ballIndex == null || !session.balls[ballIndex]) {
    return { ...session, error: `${actor.name} has no revealed Pokéball to keep.` };
  }
  const ball = session.balls[ballIndex];
  const players = session.players.map((p) =>
    p.id === actorId
      ? { ...p, pendingBall: null, won: [...p.won, ball.entry], lastAction: `kept ${entryLabel(ball.entry)}` }
      : p
  );
  const balls = session.balls.map((b, i) => (i === ballIndex ? { ...b, state: 'won', ownerId: actorId } : b));
  return settleDeal(session, players, balls, `${actor.name} kept ${entryLabel(ball.entry)}!`);
}

/** No Deal: swap the revealed Pokemon for a different remaining closed ball (old one burned). */
export function dealSwap(session, ballIndex) {
  if (session.status !== 'playing' || session.stepPos < 2) {
    return { ...session, error: 'Both players need to pick their Pokéballs first.' };
  }
  const actorId = stepActor(session);
  const actor = session.players[actorId];
  const fromIndex = actor.pendingBall;
  const fromBall = session.balls[fromIndex];
  const toBall = session.balls[ballIndex];
  if (!toBall || fromIndex === ballIndex || toBall.state !== 'closed') {
    return { ...session, error: 'Pick a different remaining closed Pokéball to swap into.' };
  }
  const players = session.players.map((p) =>
    p.id === actorId
      ? { ...p, pendingBall: null, burned: p.burned + 1, won: [...p.won, toBall.entry], lastAction: `swapped ${entryLabel(fromBall.entry)} for ${entryLabel(toBall.entry)}` }
      : p
  );
  const balls = session.balls.map((b, i) => {
    if (i === fromIndex) return { ...b, state: 'burned', ownerId: actorId };
    if (i === ballIndex) return { ...b, state: 'won', ownerId: actorId };
    return b;
  });
  return settleDeal(session, players, balls, `${actor.name} swapped ${entryLabel(fromBall.entry)} for ${entryLabel(toBall.entry)}!`);
}

/**
 * Advance from the round_complete pause to the next round.
 * Called when the player clicks "Next Round →".
 */
export function advanceRound(session) {
  if (session.status !== 'round_complete') return session;
  if (session.round >= ROUNDS) {
    return { ...session, status: 'summary' };
  }
  const nextRound = session.rounds[session.round];
  return {
    ...session,
    players: session.players.map((p) => ({ ...p, pendingBall: null })),
    balls: nextRound.entries.map((entry) => ({ entry, state: 'closed', ownerId: null })),
    round: session.round + 1,
    stepPos: 0,
    themeCategory: nextRound.category,
    themeLabel: nextRound.label,
    status: 'playing',
    error: null,
    lastResult: `Round ${session.round + 1}: ${nextRound.label}`,
  };
}

/** Shared tail of dealKeep / dealSwap: advance the deal step, roll over the round. */
function settleDeal(session, players, balls, lastResult) {
  const stepPos = session.stepPos + 1;

  // Round complete (both deals resolved) — pause for review.
  if (stepPos >= 4) {
    if (session.round >= ROUNDS) {
      return { ...session, players, balls, stepPos, status: 'summary', error: null, lastResult };
    }
    // Show the resolved board before advancing — player must click "Next Round"
    return {
      ...session,
      players: players.map((p) => ({ ...p, pendingBall: null })),
      balls,
      stepPos,
      status: 'round_complete',
      error: null,
      lastResult,
    };
  }

  return { ...session, players, balls, stepPos, error: null, lastResult };
}

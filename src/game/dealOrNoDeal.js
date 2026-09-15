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

import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };
import speciesMeta from '../data/speciesMeta.json' with { type: 'json' };
import { enrichEntry, entryGeneration, SHINY_CHANCE } from './mysteryDraft.js';

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

/**
 * Build one themed round set: 6 enriched entries sharing a common trait.
 * Base species only (no alternate forms), so batches behave like battle teams.
 */
function buildThemedRound({ category, maxGen, rng }) {
  let candidates = [];
  let label = '';

  if (category === 'gen') {
    const gens = Array.from({ length: maxGen }, (_, i) => i + 1).filter(
      (g) => defaultPokemonList.filter((p) => entryGeneration(p, speciesMeta) === g).length >= BALLS_PER_SET
    );
    const g = gens[Math.floor(rng() * gens.length)];
    candidates = defaultPokemonList.filter((p) => entryGeneration(p, speciesMeta) === g);
    label = `Gen ${g}`;
  } else if (category === 'color') {
    const byColor = {};
    defaultPokemonList.forEach((p) => {
      const c = (speciesMeta[p.id] || {}).color;
      if (c) (byColor[c] = byColor[c] || []).push(p);
    });
    const keys = Object.keys(byColor).filter((c) => byColor[c].length >= BALLS_PER_SET);
    const c = keys[Math.floor(rng() * keys.length)];
    candidates = byColor[c];
    label = titleCase(c);
  } else {
    candidates = defaultPokemonList.filter((p) => speciesMeta[p.id] && speciesMeta[p.id].rarer);
    label = 'Legendary / Mythical';
  }

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const entries = shuffled
    .slice(0, BALLS_PER_SET)
    .map((p) => enrichEntry(p, speciesMeta, rng() < SHINY_CHANCE));
  return { category, label, entries };
}

/**
 * Create a full session: all 6 themed rounds are prebuilt up front so the
 * session (and the whole playing state) stays plain JSON-serializable.
 */
export function createSession({ playerNames, maxGen = 9, rng = defaultRng }) {
  const categories = THEME_CATEGORIES.map((c) => c.id);
  const rounds = Array.from({ length: ROUNDS }, () => {
    const category = categories[Math.floor(rng() * categories.length)];
    return buildThemedRound({ category, maxGen, rng });
  });
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
  if (session.status !== 'playing' || session.stepPos > 3) return null;
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

/** Shared tail of dealKeep / dealSwap: advance the deal step, roll over the round. */
function settleDeal(session, players, balls, lastResult) {
  const stepPos = session.stepPos + 1;

  // Round complete (both deals resolved).
  if (stepPos >= 4) {
    if (session.round >= ROUNDS) {
      return { ...session, players, balls, stepPos, status: 'summary', error: null, lastResult };
    }
    const nextRound = session.rounds[session.round];
    return {
      ...session,
      players: players.map((p) => ({ ...p, pendingBall: null })),
      balls: nextRound.entries.map((entry) => ({ entry, state: 'closed', ownerId: null })),
      round: session.round + 1,
      stepPos: 0,
      themeCategory: nextRound.category,
      themeLabel: nextRound.label,
      error: null,
      lastResult: `${lastResult}  —  Round ${session.round + 1}: ${nextRound.label}`,
    };
  }

  return { ...session, players, balls, stepPos, error: null, lastResult };
}
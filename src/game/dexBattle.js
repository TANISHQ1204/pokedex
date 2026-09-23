// Pure local-state logic for the "Dex Battle" party game mode.
// No Supabase, no persistence — everything lives in React component state.
//
// Every round draws a SECRET Pokemon and shows only its dex number. Both
// players race (no turns) to type a Pokemon name from memory. Once BOTH have
// locked a guess the round resolves: the player whose guessed dex number is
// CLOSEST to the secret's dex number wins that Pokemon. Equal-distance rounds
// (including double exact hits) are VOIDED and replaced by a fresh secret from
// the same pool. The winner's prize is re-randomized AT AWARD TIME among the
// secret dexNumber's available forms (base species + alt forms) with the usual
// ~15% shiny chance.
//
// First player to 6 wins; every remaining uncontested dex number is then
// awarded (random forms) to the trailing player so both end with a full
// 6-Pokemon team, and the shared DraftSummary decides the champion.

import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };
import formsList from '../data/forms.json' with { type: 'json' };
import speciesMeta from '../data/speciesMeta.json' with { type: 'json' };
import {
  enrichEntry,
  enrichFormEntry,
  entryGeneration,
  normalizeGens,
  ALL_GENS,
  SHINY_CHANCE,
  formatName,
} from './mysteryDraft.js';

export const TEAM_SIZE = 6;

export const AUTOFILL_SUGGESTIONS = 12;

function defaultRng() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xffffffff + 1);
}

/** Normalize a typed name for matching: lowercase + strip non-alphanumerics. */
function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isForm(p) {
  return p.kind === 'form' || Number(p.id) >= 10001;
}

/** Raw pool (base + alt forms) restricted to the allowed generations. */
function buildEligibleRaw(gens = ALL_GENS) {
  const allowed = normalizeGens(gens);
  const bases = defaultPokemonList.filter((p) => allowed.has(entryGeneration(p, speciesMeta)));
  const forms = formsList.filter((f) => allowed.has(f.generation));
  return [...bases, ...forms];
}

/** Sorted, de-duplicated list of eligible dex numbers. */
function eligibleDexList(raw) {
  const set = new Set();
  raw.forEach((p) => set.add(Number(p.dexNo || p.id)));
  return [...set].sort((a, b) => a - b);
}

/** Map dexNumber -> candidate entries (base species + alt forms). */
function buildVariantsByDex(raw) {
  const byDex = new Map();
  for (const p of raw) {
    const dex = Number(p.dexNo || p.id);
    if (!byDex.has(dex)) byDex.set(dex, []);
    byDex.get(dex).push(p);
  }
  return byDex;
}

/** Map normalized name/display -> { dexNo, id, label } for guess matching. */
function buildNameLookup(raw) {
  const lookup = new Map();
  for (const p of raw) {
    const dex = Number(p.dexNo || p.id);
    if (p.name) {
      const keyName = normalizeName(p.name);
      if (keyName && !lookup.has(keyName)) lookup.set(keyName, { dexNo: dex, id: p.id, label: formatName(p.name) });
    }
    if (p.display) {
      const keyDisplay = normalizeName(p.display);
      if (keyDisplay && !lookup.has(keyDisplay)) lookup.set(keyDisplay, { dexNo: dex, id: p.id, label: p.display });
    }
  }
  return lookup;
}

function titleForSecret(raw, dex) {
  const variants = buildVariantsByDex(raw).get(dex) || [];
  if (variants.length === 0) return `#${String(dex).padStart(3, '0')}`;
  const first = variants[0];
  return `#${String(dex).padStart(3, '0')} ${first.display || formatName(first.name)}`;
}

/** Enrich ONE awarded Pokemon for a dexNumber: pick a random eligible form
 *  variant (base or alt) with a fresh shiny roll. */
function awardEntry(dex, variantsByDex, rng) {
  const variants = variantsByDex.get(dex) || [];
  if (variants.length === 0) return null;
  const pick = variants[Math.floor(rng() * variants.length)];
  const shiny = rng() < SHINY_CHANCE;
  return isForm(pick) ? enrichFormEntry(pick, shiny) : enrichEntry(pick, speciesMeta, shiny);
}

/** Draw a secret dexNumber not yet seen in this session (null if exhausted). */
function drawSecret(raw, usedDex, rng) {
  const dexList = eligibleDexList(raw).filter((d) => !usedDex.includes(d));
  if (dexList.length === 0) return null;
  return dexList[Math.floor(rng() * dexList.length)];
}

export function createSession({ playerNames, gens = ALL_GENS, rng = defaultRng }) {
  const includedGens = [...normalizeGens(gens)].sort((a, b) => a - b);
  const raw = buildEligibleRaw(includedGens);
  const firstDex = drawSecret(raw, [], rng);
  return {
    players: playerNames.map((name, id) => ({ id, name, won: [] })),
    gens: includedGens,
    round: firstDex == null ? 0 : 1,
    voidedRounds: 0,
    secretDex: firstDex,
    secretLabel: firstDex == null ? '' : titleForSecret(raw, firstDex),
    guesses: [null, null],
    phase: firstDex == null ? 'summary' : 'guess',
    resolved: null,
    usedDex: firstDex == null ? [] : [firstDex],
    lastResult: null,
    error: null,
  };
}

/** Normalized autocomplete suggestions (label + dex) for a typed prefix. */
export function nameOptions(gens, prefix, limit = AUTOFILL_SUGGESTIONS) {
  const raw = buildEligibleRaw(gens);
  const items = [];
  for (const p of raw) {
    const dex = Number(p.dexNo || p.id);
    const label = p.display || formatName(p.name);
    items.push({ dexNo: dex, label, key: normalizeName(label) });
  }
  const q = normalizeName(prefix);
  if (!q) return [];
  const seen = new Set();
  const direct = [];
  const fuzzy = [];
  for (const it of items) {
    if (seen.has(it.key)) continue;
    seen.add(it.key);
    if (it.key.startsWith(q)) direct.push(it);
    else if (it.key.includes(q)) fuzzy.push(it);
  }
  return [...direct, ...fuzzy].slice(0, limit);
}

/**
 * Lock a player's guess. When the other player has already locked, the round
 * resolves immediately (see resolveRound).
 */
export function lockGuess(session, playerId, rawName) {
  if (session.phase !== 'guess') {
    return { ...session, error: 'There is no active round to guess on.' };
  }
  const player = session.players[playerId];
  if (!player) return { ...session, error: 'Unknown player.' };
  if (session.guesses[playerId]) {
    return { ...session, error: `${player.name} already locked a guess.` };
  }
  const name = String(rawName || '').trim();
  if (!name) {
    return { ...session, error: 'Type a Pokemon name first.' };
  }
  const lookup = buildNameLookup(buildEligibleRaw(session.gens));
  const match = lookup.get(normalizeName(name));
  if (!match) {
    return { ...session, error: `"${name}" is not a known Pokemon in the selected generations.` };
  }

  const guesses = [...session.guesses];
  guesses[playerId] = { playerId, name: match.label, dexNo: match.dexNo };

  if (!guesses[1 - playerId]) {
    const next = { ...session, guesses, error: null };
    next.lastResult = `${player.name} locked a guess — ${
      session.players[1 - playerId].name
    } needs to lock too.`;
    return next;
  }

  return resolveRound({ ...session, guesses, error: null });
}

/** All guesses are in: decide closest dex, award (or void a tie). */
function resolveRound(session) {
  const secretDex = session.secretDex;
  const raw = buildEligibleRaw(session.gens);
  const guessInfos = session.guesses.map((g) => ({
    playerId: g.playerId,
    name: g.name,
    dexNo: g.dexNo,
    distance: Math.abs(g.dexNo - secretDex),
  }));

  const dist0 = guessInfos[0].distance;
  const dist1 = guessInfos[1].distance;
  const voided = dist0 === dist1;

  if (voided) {
    const usedDex = [...session.usedDex];
    const nextDex = drawSecret(raw, usedDex, defaultRng);
    if (nextDex == null) return finishBothTeams(session, guessInfos, voided);
    usedDex.push(nextDex);
    return {
      ...session,
      guesses: [null, null],
      resolved: { secretDex, guesses: guessInfos, voided: true, winnerId: null, awarded: null },
      phase: 'resolved',
      secretDex: nextDex,
      secretLabel: titleForSecret(raw, nextDex),
      usedDex,
      voidedRounds: (session.voidedRounds || 0) + 1,
      lastResult: `🤝 Tie! Both guessed equally close — the round is voided and a new Pokemon is drawn.`,
      error: null,
    };
  }

  const winnerId = dist0 < dist1 ? 0 : 1;
  const winner = session.players[winnerId];
  const variantsByDex = buildVariantsByDex(raw);
  const awarded = awardEntry(secretDex, variantsByDex, defaultRng);

  const won = awarded ? [...winner.won, awarded] : winner.won;
  const players = session.players.map((p) => (p.id === winnerId ? { ...p, won } : p));
  const usedDex = [...session.usedDex];

  let nextSession = {
    ...session,
    players,
    usedDex,
    phase: won.length >= TEAM_SIZE ? 'summary' : 'resolved',
    guesses: [null, null],
    resolved: { secretDex, guesses: guessInfos, voided: false, winnerId, awarded },
    error: null,
  };

  nextSession.lastResult = `🏆 ${winner.name} wins the round${awarded ? ` — +${awarded.display || awarded.name}` : ''}!`;

  if (won.length >= TEAM_SIZE) {
    return fillTrailingPlayer(nextSession, winnerId, usedDex, raw, variantsByDex, defaultRng);
  }

  return nextSession;
}

/** Award the remaining uncontested dex numbers to the other player (to 6). */
function fillTrailingPlayer(nextSession, winnerId, usedDex, raw, variantsByDex, rng) {
  const loserId = 1 - winnerId;
  const loser = nextSession.players[loserId];
  const need = TEAM_SIZE - loser.won.length;
  const dexList = eligibleDexList(raw).filter((d) => !usedDex.includes(d));
  const extra = [];
  const nextUsed = [...usedDex];
  for (const dex of dexList) {
    if (extra.length >= need) break;
    const entry = awardEntry(dex, variantsByDex, rng);
    if (!entry) continue;
    extra.push(entry);
    nextUsed.push(dex);
  }

  const players = nextSession.players.map((p) =>
    p.id === loserId ? { ...p, won: [...p.won, ...extra] } : p
  );
  return {
    ...nextSession,
    players,
    usedDex: nextUsed,
    phase: 'summary',
    guesses: [null, null],
    lastResult: `${nextSession.players[winnerId].name} reached ${TEAM_SIZE} Pokemon — remaining Pokemon go to ${
      nextSession.players[loserId].name
    }.`,
    error: null,
  };
}

/** Safety fallback: pool exhausted mid-match — complete both teams to 6. */
function finishBothTeams(session, guessInfos, voided) {
  const raw = buildEligibleRaw(session.gens);
  const variantsByDex = buildVariantsByDex(raw);
  const dexList = eligibleDexList(raw).filter((d) => !session.usedDex.includes(d));
  const leftovers = [];
  const nextUsed = [...session.usedDex];
  for (const dex of dexList) {
    const entry = awardEntry(dex, variantsByDex, defaultRng);
    if (!entry) continue;
    leftovers.push(entry);
    nextUsed.push(dex);
  }
  const players = session.players.map((p) => {
    const need = TEAM_SIZE - p.won.length;
    return { ...p, won: [...p.won, ...leftovers.slice(0, need)] };
  });
  return {
    ...session,
    players,
    usedDex: nextUsed,
    phase: 'summary',
    guesses: [null, null],
    resolved: { secretDex: session.secretDex, guesses: guessInfos, voided, winnerId: null, awarded: null },
    lastResult: 'The pool ran dry — both teams were completed from the remaining Pokemon.',
    error: null,
  };
}

/** Advance from the resolved review pause to the next round. */
export function advanceRound(session) {
  if (session.phase !== 'resolved') return session;
  const raw = buildEligibleRaw(session.gens);
  const usedDex = [...session.usedDex];
  const nextDex = drawSecret(raw, usedDex, defaultRng);
  if (nextDex == null) return finishBothTeams(session, session.resolved.guesses, false);
  usedDex.push(nextDex);
  return {
    ...session,
    phase: 'guess',
    guesses: [null, null],
    resolved: null,
    secretDex: nextDex,
    secretLabel: titleForSecret(raw, nextDex),
    usedDex,
    round: (session.round || 0) + 1,
    error: null,
  };
}
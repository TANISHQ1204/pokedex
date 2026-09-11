// Pure local-state logic for the "Mystery Draft" party game mode.
// No Supabase, no persistence — everything lives in React component state.

export const ATTRIBUTES = [
  { id: 'name', label: 'Name' },
  { id: 'color', label: 'Color' },
  { id: 'generation', label: 'Generation' },
  { id: 'number', label: 'Dex #' },
  { id: 'types', label: 'Types' },
  { id: 'species', label: 'Species' },
];

export const ATTRIBUTE_IDS = ATTRIBUTES.map((a) => a.id);

export const SHINY_CHANCE = 0.15;

export const MAX_TEAM_SIZE = 6;

// Winner-scoring multipliers: every Pokemon's base stat total (BST) is scaled
// by a transparent stack — rarer/legendary-mythical, shiny, and alternate form.
// A shiny legendary form would score BST × 1.5 × 1.2 × 1.1.
export const RARE_MULTIPLIER = 1.5;
export const SHINY_MULTIPLIER = 1.2;
export const FORM_MULTIPLIER = 1.1;

/** Sum a Pokemon's six base stats (hp/atk/def/spa/spd/spe). */
export function baseStatTotal(pkmn) {
  const stats = pkmn && pkmn.stats;
  if (!stats) return 0;
  return (
    Number(stats.hp) +
    Number(stats.attack) +
    Number(stats.defense) +
    Number(stats.specialAttack) +
    Number(stats.specialDefense) +
    Number(stats.speed)
  );
}

export function formatName(raw) {
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getAttributeValue(entry, attrId) {
  switch (attrId) {
    case 'name':
      return entry.display || formatName(entry.name);
    case 'color':
      return entry.color ? formatName(entry.color) : '???';
    case 'generation':
      return `Gen ${entry.generation}`;
    case 'number':
      return `#${String(entry.dexNo || entry.id).padStart(3, '0')}`;
    case 'types':
      return (entry.types || []).map(formatName).join(' / ') || '???';
    case 'species':
      return entry.genus || '???';
    default:
      return '???';
  }
}

export function entryGeneration(entry, speciesMeta) {
  if (Number.isInteger(entry.generation)) return entry.generation;
  const meta = speciesMeta[entry.id];
  return meta && Number.isInteger(meta.gen) ? meta.gen : Math.ceil(entry.id / 151);
}

export function getEligiblePool(pokemonList, forms, speciesMeta, maxGen) {
  const bases = pokemonList.filter((p) => entryGeneration(p, speciesMeta) <= maxGen);
  const formPool = (forms || []).filter((f) => f.generation <= maxGen);
  return [...bases, ...formPool];
}

export function enrichEntry(pokemon, speciesMeta, isShiny) {
  const meta = speciesMeta[pokemon.id] || {};
  const shiny = !!isShiny;
  return {
    id: pokemon.id,
    dexNo: pokemon.id,
    name: pokemon.name,
    display: formatName(pokemon.name),
    color: meta.color || 'unknown',
    generation: entryGeneration(pokemon, speciesMeta),
    genus: meta.genus || '',
    rarer: !!meta.rarer,
    types: pokemon.types,
    bst: baseStatTotal(pokemon),
    variant: shiny ? 'shiny' : 'normal',
    sprite: shiny ? pokemon.sprites.shiny : pokemon.sprites.normal,
  };
}

/** Enrich an alternate-form entry read from src/data/forms.json. */
export function enrichFormEntry(form, isShiny) {
  const shiny = !!isShiny;
  return {
    id: form.id,
    dexNo: form.dexNo,
    name: form.name,
    display: form.display,
    color: form.color || 'unknown',
    generation: form.generation,
    genus: form.genus || '',
    rarer: !!form.rarer,
    formKind: form.kind,
    formLabel: form.label || 'Alternate Form',
    types: form.types,
    bst: Number(form.bst) || baseStatTotal(form),
    variant: shiny ? 'shiny' : 'normal',
    sprite: shiny ? form.sprites.shiny : form.sprites.normal,
  };
}

/**
 * Score a single Pokemon: base BST scaled by rarity (×1.5), shiny (×1.2) and
 * alternate-form (×1.1) multipliers. Multipliers stack multiplicatively and the
 * result is rounded so the math is easy to eyeball at the summary screen.
 */
export function pkmnScore(entry) {
  const bst = Number(entry && entry.bst) || 0;
  const mult = pkmnMultiplier(entry);
  return Math.round(bst * mult);
}

export function pkmnMultiplier(entry) {
  return (
    (entry && entry.rarer ? RARE_MULTIPLIER : 1) *
    (entry && entry.variant === 'shiny' ? SHINY_MULTIPLIER : 1) *
    (entry && entry.formKind ? FORM_MULTIPLIER : 1)
  );
}

/**
 * Whole-team scoring used to declare the draft winner. Money played is NOT a
 * factor — every Pokemon earns its own scaled score (see pkmnScore) and the
 * team's total is simply the sum.
 *
 * Returns a transparent breakdown including each Pokemon's multiplier.
 */
export function teamScoreBreakdown(player) {
  const won = player.won || [];
  const perPokemon = won.map((entry) => {
    const bst = Number(entry.bst) || 0;
    const mult = pkmnMultiplier(entry);
    return { entry, bst, mult, score: Math.round(bst * mult) };
  });

  const types = new Set();
  won.forEach((e) => (e.types || []).forEach((t) => types.add(String(t).toLowerCase())));
  const typeCoverage = types.size;

  const rare = won.filter((e) => e.rarer).length;
  const shiny = won.filter((e) => e.variant === 'shiny').length;
  const forms = won.filter((e) => e.formKind).length;

  return {
    bst: perPokemon.reduce((acc, p) => acc + p.bst, 0),
    typeCoverage,
    rare,
    shiny,
    forms,
    perPokemon,
    total: perPokemon.reduce((acc, p) => acc + p.score, 0),
    types: [...types],
  };
}

/**
 * Pick the draft winner: highest whole-team scored total. Exact-equal totals
 * are always a true draw (returns null) — no hidden tiebreak bonuses.
 */
export function pickWinner(players) {
  if (!players || players.length === 0) return null;
  if (players.length === 1) return players[0];

  const scored = players.map((p) => ({ player: p, total: teamScoreBreakdown(p).total }));
  const max = Math.max(...scored.map((s) => s.total));
  const winners = scored.filter((s) => s.total === max);
  return winners.length === 1 ? winners[0].player : null;
}

/** Strongest single Pokemon + BST among a player's drafted team. */
export function strongestPick(player) {
  const won = player.won || [];
  if (won.length === 0) return null;
  return won
    .map((e) => ({ entry: e, bst: Number(e.bst) || 0 }))
    .sort((a, b) => b.bst - a.bst)[0];
}

/** Weakest single Pokemon + BST among a player's drafted team. */
export function weakestPick(player) {
  const won = player.won || [];
  if (won.length === 0) return null;
  return won
    .map((e) => ({ entry: e, bst: Number(e.bst) || 0 }))
    .sort((a, b) => a.bst - b.bst)[0];
}

/**
 * Fun end-screen superlatives across every player's drafted team.
 * Tie-breaks resolve to the first in player order (deterministic).
 */
export function superlatives(players) {
  const all = (players || []).flatMap((player) =>
    (player.won || []).map((entry) => ({ player, entry, score: pkmnScore(entry) }))
  );

  let strongest = null;
  for (const it of all) {
    if (!strongest || it.score > strongest.score) strongest = { entry: it.entry, score: it.score };
  }

  // Best value pick: paid is stamped on each won entry by settleAuction.
  // A $0 (free) bid is infinite value; ties break toward higher BST.
  let valuePick = null;
  for (const it of all) {
    const cost = it.entry.paid;
    if (typeof cost !== 'number') continue;
    const bst = Number(it.entry.bst) || 0;
    const value = cost === 0 ? Infinity : bst / cost;
    const better =
      !valuePick ||
      value > valuePick.value ||
      (value === valuePick.value && bst > valuePick.bst);
    if (better) valuePick = { entry: it.entry, value, bst, cost };
  }

  let mostLegendaries = null;
  for (const p of players || []) {
    const count = (p.won || []).filter((e) => e.rarer).length;
    if (count > 0 && (!mostLegendaries || count > mostLegendaries.count)) mostLegendaries = { player: p, count };
  }

  let bestCoverage = null;
  for (const p of players || []) {
    const types = new Set();
    (p.won || []).forEach((e) => (e.types || []).forEach((t) => types.add(String(t).toLowerCase())));
    const count = types.size;
    if (count > 0 && (!bestCoverage || count > bestCoverage.count)) bestCoverage = { player: p, count };
  }

  return { strongest, valuePick, mostLegendaries, bestCoverage };
}

function secureRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xffffffff + 1);
}

export function draftQueue(pokemonList, forms, speciesMeta, maxGen, count = 12, random = secureRandom) {
  const pool = getEligiblePool(pokemonList, forms, speciesMeta, maxGen);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled
    .slice(0, count)
    .map((p) =>
      p.kind ? enrichFormEntry(p, random() < SHINY_CHANCE) : enrichEntry(p, speciesMeta, random() < SHINY_CHANCE)
    );
}

export function createSession({ playerNames, budget, queue, firstPlayerId = 0, blind = false }) {
  return {
    queue,
    queueIndex: 0,
    blind,
    players: playerNames.map((name, i) => ({
      id: i,
      name,
      budget,
      startBudget: budget,
      usedTokens: [],
      won: [],
    })),
    nextPointer: firstPlayerId,
    revealed: [],
    status: 'reveal',
    lastResult: null,
    error: null,
  };
}

export function playerAvailableTokens(player) {
  return ATTRIBUTE_IDS.filter((a) => !player.usedTokens.includes(a));
}

export function nextActor(state) {
  const player = state.players[state.nextPointer];
  if (!player) return null;
  const available = playerAvailableTokens(player);
  return available.length > 0 ? { playerId: player.id, available } : null;
}

export function revealAttribute(state, playerId, attributeId) {
  const actor = nextActor(state);
  if (!actor || actor.playerId !== playerId) {
    return {
      ...state,
      error: `It is ${actor ? state.players[actor.playerId].name : 'no one'}'s turn to reveal right now.`,
    };
  }
  const player = state.players[playerId];
  if (!ATTRIBUTE_IDS.includes(attributeId) || player.usedTokens.includes(attributeId)) {
    return { ...state, error: 'That attribute is no longer available.' };
  }

  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, usedTokens: [...p.usedTokens, attributeId] } : p
  );
  // One reveal per Pokemon: record the single clue, then move straight to auction.
  // Persist the hint onto the Pokemon's queue entry so the final summary can
  // recap every clue — including no-sale Pokemon that never join a team.
  const queue = state.queue.map((q, i) =>
    i === state.queueIndex ? { ...q, hint: { playerId, attributeId } } : q
  );
  const revealed = [{ playerId, attributeId }];
  return { ...state, queue, players, revealed, error: null, status: 'bid' };
}

export function settleAuction(state, { winnerId, amount }) {
  const currentEntry = state.queue[state.queueIndex];
  let players = state.players;
  let error = null;

  const isNoSale = winnerId === null || winnerId === undefined;
  const bidAmount = Number(amount);

  if (!isNoSale) {
    const winner = state.players.find((p) => p.id === winnerId);
    if (!winner) return { ...state, error: 'Select a valid winner.' };
    if (winner.won.length >= MAX_TEAM_SIZE) {
      return {
        ...state,
        error: `${winner.name} already has a full team of ${MAX_TEAM_SIZE} — pick the other player or mark no-sale.`,
      };
    }
    if (!Number.isInteger(bidAmount)) return { ...state, error: 'Bid must be a whole number.' };
    if (bidAmount < 0) return { ...state, error: 'Bid cannot be negative.' };
    if (bidAmount > winner.budget) {
      return { ...state, error: `Bid exceeds ${winner.name}'s remaining budget (${winner.budget}).` };
    }
    players = state.players.map((p) =>
      p.id === winnerId
        ? { ...p, budget: p.budget - bidAmount, won: [...p.won, { ...currentEntry, paid: bidAmount }] }
        : p
    );
  }

  const lastResult = isNoSale
    ? { winnerId: null, amount: 0, entry: currentEntry, noSale: true }
    : {
        winnerId,
        entry: currentEntry,
        amount: bidAmount,
        budgetAfter: players[winnerId].budget,
      };

  const nextIndex = state.queueIndex + 1;
  const advanced = {
    ...state,
    players,
    revealed: [],
    queueIndex: nextIndex,
    // Alternate which player reveals first each Pokemon for fairness.
    nextPointer: players.length > 0 ? nextIndex % players.length : 0,
    lastResult,
    error,
  };
  return {
    ...advanced,
    status:
      nextIndex >= state.queue.length ? 'summary' : nextActor(advanced) ? 'reveal' : 'bid',
  };
}
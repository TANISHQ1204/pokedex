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

export function formatName(raw) {
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getAttributeValue(entry, attrId) {
  switch (attrId) {
    case 'name':
      return formatName(entry.name);
    case 'color':
      return entry.color ? formatName(entry.color) : '???';
    case 'generation':
      return `Gen ${entry.generation}`;
    case 'number':
      return `#${String(entry.id).padStart(3, '0')}`;
    case 'types':
      return (entry.types || []).map(formatName).join(' / ') || '???';
    case 'species':
      return entry.genus || '???';
    default:
      return '???';
  }
}

export function entryGeneration(entry, speciesMeta) {
  const meta = speciesMeta[entry.id];
  return meta && Number.isInteger(meta.gen) ? meta.gen : Math.ceil(entry.id / 151);
}

export function getEligiblePool(pokemonList, speciesMeta, maxGen) {
  return pokemonList.filter((p) => entryGeneration(p, speciesMeta) <= maxGen);
}

export function enrichEntry(pokemon, speciesMeta, isShiny) {
  const meta = speciesMeta[pokemon.id] || {};
  const shiny = !!isShiny;
  return {
    id: pokemon.id,
    name: pokemon.name,
    color: meta.color || 'unknown',
    generation: entryGeneration(pokemon, speciesMeta),
    genus: meta.genus || '',
    rarer: !!meta.rarer,
    types: pokemon.types,
    variant: shiny ? 'shiny' : 'normal',
    sprite: shiny ? pokemon.sprites.shiny : pokemon.sprites.normal,
  };
}

export function draftQueue(pokemonList, speciesMeta, maxGen, count = 12, random = Math.random) {
  const pool = getEligiblePool(pokemonList, speciesMeta, maxGen);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map((p) => enrichEntry(p, speciesMeta, random() < SHINY_CHANCE));
}

export function createSession({ playerNames, budget, queue, firstPlayerId = 0 }) {
  return {
    queue,
    queueIndex: 0,
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
  const revealed = [{ playerId, attributeId }];
  return { ...state, players, revealed, error: null, status: 'bid' };
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
      p.id === winnerId ? { ...p, budget: p.budget - bidAmount, won: [...p.won, currentEntry] } : p
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
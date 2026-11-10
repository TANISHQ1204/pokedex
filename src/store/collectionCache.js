import { findNormalRecord } from '../utils/cardTypes.js';
import {
  MAX_STAR_LEVEL,
  SHINY_STAR_LEVEL,
  starLevelFromDupes,
} from '../game/cardLevels.js';

const CACHE_PREFIX = 'pokedex_collection_cache_v1';

function cacheKey(userId) {
  return `${CACHE_PREFIX}_${userId || 'preview'}`;
}

function sortRows(rows) {
  return rows.sort((a, b) => Number(a?.pokemon_id) - Number(b?.pokemon_id));
}

export function readCollectionCache(userId) {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function writeCollectionCache(userId, rows) {
  if (!userId) return false;

  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(Array.isArray(rows) ? rows : []));
    return true;
  } catch (_) {
    return false;
  }
}

function sameCardType(a, b) {
  return Boolean(a?.is_power_card) === Boolean(b?.is_power_card)
    && Boolean(a?.is_ancient_card) === Boolean(b?.is_ancient_card);
}

export function upsertRowsEntry(rows, entry) {
  if (!entry || entry.pokemon_id == null) return Array.isArray(rows) ? rows : [];

  const source = Array.isArray(rows) ? rows : [];
  const id = Number(entry.pokemon_id);
  let replaced = false;

  const next = source.map((row) => {
    if (!row || Number(row.pokemon_id) !== id || !sameCardType(row, entry)) return row;
    replaced = true;
    return { ...row, ...entry };
  });

  if (!replaced) next.push({ ...entry });
  return sortRows(next);
}

export function upsertCachedEntry(userId, entry) {
  if (!userId) return [];

  const rows = readCollectionCache(userId) || [];
  const next = upsertRowsEntry(rows, entry);
  writeCollectionCache(userId, next);
  return next;
}

export function applyAwardToRows(rows, pokemonId) {
  const source = Array.isArray(rows) ? rows : [];
  const id = Number(pokemonId);
  const existing = findNormalRecord(
    source.filter((row) => row && Number(row.pokemon_id) === id)
  );

  if (!existing) {
    const newEntry = {
      pokemon_id: id,
      star_level: 1,
      dupes_collected: 0,
      is_shiny: false,
      is_power_card: false,
      is_ancient_card: false,
      updated_at: new Date().toISOString(),
    };

    return {
      rows: sortRows([...source, newEntry]),
      drop: {
        isNew: true,
        entry: newEntry,
        starUpgraded: false,
        becameShiny: false,
      },
      target: {
        pokemonId: id,
        starLevel: 1,
        dupesCollected: 0,
        isShiny: false,
        pulls: 1,
        baseKnown: false,
      },
    };
  }

  const currentStar = Math.max(
    1,
    Math.min(MAX_STAR_LEVEL, Math.floor(Number(existing.star_level) || 1))
  );
  const currentDupes = Math.max(0, Math.floor(Number(existing.dupes_collected) || 0));

  if (currentStar >= MAX_STAR_LEVEL) {
    return {
      rows: source,
      drop: {
        isNew: false,
        entry: existing,
        starUpgraded: false,
        becameShiny: false,
        maxedOut: true,
      },
      target: {
        pokemonId: id,
        starLevel: currentStar,
        dupesCollected: currentDupes,
        isShiny: Boolean(existing.is_shiny),
        pulls: 1,
        baseKnown: true,
      },
    };
  }

  const newDupes = Math.min(MAX_STAR_LEVEL - 1, currentDupes + 1);
  const newStar = starLevelFromDupes(newDupes, currentStar);
  const starUpgraded = newStar > currentStar;
  const becameShiny = !existing.is_shiny && newStar >= SHINY_STAR_LEVEL;
  const updatedEntry = {
    ...existing,
    star_level: newStar,
    dupes_collected: newDupes,
    is_shiny: Boolean(existing.is_shiny) || becameShiny,
    updated_at: new Date().toISOString(),
  };

  const index = source.indexOf(existing);
  const next = source.slice();
  next[index] = updatedEntry;

  return {
    rows: next,
    drop: {
      isNew: false,
      entry: updatedEntry,
      starUpgraded,
      becameShiny,
    },
    target: {
      pokemonId: id,
      starLevel: newStar,
      dupesCollected: newDupes,
      isShiny: updatedEntry.is_shiny,
      pulls: 1,
      baseKnown: true,
    },
  };
}

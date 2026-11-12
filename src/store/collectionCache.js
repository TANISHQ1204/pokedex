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

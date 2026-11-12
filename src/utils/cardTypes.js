import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL } from '../game/cardLevels.js';

function isLegacySpecialRecord(record) {
  return Boolean(
    record &&
      (record.is_power_card ||
        record.isPowerCard ||
        record.is_ancient_card ||
        record.isAncientCard)
  );
}

/** A record represents a collectible card when it is not a legacy special row. */
export function isNormalRecord(record) {
  return Boolean(record && record.pokemon_id != null && !isLegacySpecialRecord(record));
}

export function getPokemonId(record) {
  return record ? Number(record.pokemon_id) : null;
}

export function findNormalRecord(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.find(isNormalRecord) || null;
}

function recordStar(record) {
  return Math.max(1, Math.min(MAX_STAR_LEVEL, Math.floor(Number(record?.star_level) || 1)));
}

function recordDupes(record) {
  return Math.max(0, Math.floor(Number(record?.dupes_collected) || 0));
}

function recordTime(record) {
  const raw = record?.updated_at || record?.created_at;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function betterRow(candidate, current) {
  if (!current) return true;
  if (recordStar(candidate) !== recordStar(current)) return recordStar(candidate) > recordStar(current);
  if (recordDupes(candidate) !== recordDupes(current)) return recordDupes(candidate) > recordDupes(current);
  if (Boolean(candidate?.is_shiny) !== Boolean(current?.is_shiny)) return Boolean(candidate?.is_shiny);
  return recordTime(candidate) > recordTime(current);
}

/**
 * Collapse duplicate rows for the same Pokemon into a single normal-card record.
 *
 * Duplicate rows were historically created when the upsert conflict target did
 * not match the database's unique indexes. Each extra row represents at least
 * one additional pull, so the merged star level uses the row count as a
 * conservative floor while still preserving the best stored star.
 *
 * @param {Array} rows - Raw collection rows from Supabase
 * @returns {Array} One record per pokemon_id, ordered by pokemon_id
 */
export function mergeCollectionRecords(rows) {
  if (!Array.isArray(rows)) return [];

  const groups = new Map();
  rows.forEach((row) => {
    if (!isNormalRecord(row)) return;
    const id = Number(row.pokemon_id);
    const existing = groups.get(id);
    if (existing) existing.push(row);
    else groups.set(id, [row]);
  });

  const merged = [];
  groups.forEach((groupRows) => {
    const keeper = groupRows.reduce((best, row) => (betterRow(row, best) ? row : best), null);
    const maxStar = Math.max(...groupRows.map(recordStar));
    const maxDupes = Math.max(...groupRows.map(recordDupes));
    const starLevel = Math.min(MAX_STAR_LEVEL, Math.max(maxStar, groupRows.length));
    const dupesCollected = Math.min(MAX_STAR_LEVEL - 1, Math.max(maxDupes, starLevel - 1));
    merged.push({
      ...keeper,
      star_level: starLevel,
      dupes_collected: dupesCollected,
      is_shiny:
        groupRows.some((row) => Boolean(row?.is_shiny)) || starLevel >= SHINY_STAR_LEVEL,
    });
  });

  return merged.sort((a, b) => Number(a.pokemon_id) - Number(b.pokemon_id));
}

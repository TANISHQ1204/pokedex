import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL } from '../game/cardLevels.js';

/**
 * Pure helpers for classifying collection records by card type.
 *
 * Each Pokemon may own up to THREE fully independent records:
 *   - one normal card   (is_power_card = false AND is_ancient_card = false)
 *   - one Power Card    (is_power_card = true)
 *   - one Ancient Card  (is_ancient_card = true)
 *
 * Ownership of one type must NEVER influence eligibility/awarding of another.
 * These helpers keep every lookup scoped to a single card type only.
 */

export function isPowerRecord(r) {
  return Boolean(r && (r.is_power_card || r.isPowerCard));
}

export function isAncientRecord(r) {
  return Boolean(r && (r.is_ancient_card || r.isAncientCard));
}

/** A record represents the standard (normal) card only when it is neither special type. */
export function isNormalRecord(r) {
  return Boolean(r && !isPowerRecord(r) && !isAncientRecord(r));
}

export function isSpecialRecord(r) {
  return isPowerRecord(r) || isAncientRecord(r);
}

export function cardTypeOf(r) {
  if (isPowerRecord(r)) return 'power';
  if (isAncientRecord(r)) return 'ancient';
  return 'normal';
}

export function getPokemonId(r) {
  return r ? Number(r.pokemon_id) : null;
}

/** Find the standard (normal) card row among a set of records. Never matches power/ancient rows. */
export function findNormalRecord(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.find(isNormalRecord) || null;
}

/** Find the Power Card row. Only matches is_power_card records. */
export function findPowerRecord(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.find(isPowerRecord) || null;
}

/** Find the Ancient Card row. Only matches is_ancient_card records. */
export function findAncientRecord(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.find(isAncientRecord) || null;
}

function recordStar(r) {
  return Math.max(1, Math.min(MAX_STAR_LEVEL, Math.floor(Number(r?.star_level) || 1)));
}

function recordDupes(r) {
  return Math.max(0, Math.floor(Number(r?.dupes_collected) || 0));
}

function recordTime(r) {
  const raw = r?.updated_at || r?.created_at;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function betterNormalRow(candidate, current) {
  if (!current) return true;
  if (recordStar(candidate) !== recordStar(current)) return recordStar(candidate) > recordStar(current);
  if (recordDupes(candidate) !== recordDupes(current)) return recordDupes(candidate) > recordDupes(current);
  if (Boolean(candidate?.is_shiny) !== Boolean(current?.is_shiny)) return Boolean(candidate?.is_shiny);
  return recordTime(candidate) > recordTime(current);
}

function betterSpecialRow(candidate, current) {
  if (!current) return true;
  if (Boolean(candidate?.is_shiny) !== Boolean(current?.is_shiny)) return Boolean(candidate?.is_shiny);
  return recordTime(candidate) > recordTime(current);
}

/**
 * Collapse duplicate rows for the same Pokemon + card type into a single record.
 *
 * Duplicate rows were historically created when the upsert conflict target did
 * not match the database's partial unique indexes. For normal cards each extra
 * row represents at least one additional pull, so the merged star level uses the
 * row count as a conservative floor while still preserving the best stored star.
 * Power/Ancient rows are never merged with normal rows.
 *
 * @param {Array} rows - Raw collection rows from Supabase
 * @returns {Array} One record per (pokemon_id, card type), ordered by pokemon_id
 */
export function mergeCollectionRecords(rows) {
  if (!Array.isArray(rows)) return [];

  const groups = new Map();
  rows.forEach((row) => {
    if (!row || row.pokemon_id == null) return;
    const type = cardTypeOf(row);
    const key = `${type}:${Number(row.pokemon_id)}`;
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  });

  const merged = [];
  groups.forEach((groupRows) => {
    const type = cardTypeOf(groupRows[0]);
    if (type === 'normal') {
      const keeper = groupRows.reduce(
        (best, row) => (betterNormalRow(row, best) ? row : best),
        null
      );
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
      return;
    }

    const keeper = groupRows.reduce(
      (best, row) => (betterSpecialRow(row, best) ? row : best),
      null
    );
    merged.push({ ...keeper });
  });

  return merged.sort((a, b) => Number(a.pokemon_id) - Number(b.pokemon_id));
}

import {
  MAX_STAR_LEVEL,
  SHINY_STAR_LEVEL,
  minimumDupesForStar,
  starLevelFromDupes,
} from './cardLevels.js';

const LEGACY_MAX_STAR = 10;
const LEGACY_MAX_DUPES = 18;

/**
 * Converts a legacy normal-card row to the 20-star rules without losing progress.
 *
 * - Legacy 10-star maxed cards (18+ dupes) stay maxed and move to 20 stars.
 * - Duplicate count is raised to the minimum implied by the stored star level.
 * - Star level is recalculated as min(20, 1 + dupes), never below the stored level.
 * - Existing shiny status is preserved; shiny is also granted at 20 stars.
 * - Power/Ancient rows are returned as null because they are independent cards.
 *
 * @param {Object} row - Collection row from Supabase
 * @param {string} updatedAt - Timestamp for changed rows
 * @returns {Object|null} Partial row to write, or null when already correct
 */
export function migrateNormalCardRow(row, updatedAt = new Date().toISOString()) {
  if (!row || row.is_power_card || row.is_ancient_card) return null;

  const storedStar = Math.max(1, Number(row.star_level) || 1);
  const storedDupes = Math.max(0, Number(row.dupes_collected) || 0);
  const wasLegacyMax = storedStar === LEGACY_MAX_STAR && storedDupes >= LEGACY_MAX_DUPES;
  const newDupes = wasLegacyMax
    ? MAX_STAR_LEVEL - 1
    : minimumDupesForStar(storedStar, storedDupes);
  const newStar = wasLegacyMax
    ? MAX_STAR_LEVEL
    : starLevelFromDupes(newDupes, storedStar);
  const newShiny = Boolean(row.is_shiny) || newStar >= SHINY_STAR_LEVEL;

  const changed =
    newDupes !== storedDupes ||
    newStar !== storedStar ||
    newShiny !== Boolean(row.is_shiny);

  if (!changed) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    pokemon_id: row.pokemon_id,
    dupes_collected: Math.min(MAX_STAR_LEVEL - 1, newDupes),
    star_level: Math.min(MAX_STAR_LEVEL, newStar),
    is_shiny: newShiny,
    updated_at: updatedAt,
  };
}

/**
 * Human-readable summary of a migration pass.
 * @param {Array} rows
 * @returns {{ total: number, normal: number, changes: Array, maxed: number, shinyUnlocked: number }}
 */
export function summarizeStarMigration(rows = []) {
  const changes = [];
  let normal = 0;
  let maxed = 0;
  let shinyUnlocked = 0;

  rows.forEach((row) => {
    if (!row || row.is_power_card || row.is_ancient_card) return;
    normal += 1;
    const change = migrateNormalCardRow(row);
    if (!change) return;
    changes.push(change);
    if (change.star_level >= MAX_STAR_LEVEL) maxed += 1;
    if (change.is_shiny && !row.is_shiny) shinyUnlocked += 1;
  });

  return {
    total: rows.length,
    normal,
    changes,
    maxed,
    shinyUnlocked,
  };
}

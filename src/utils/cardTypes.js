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
/**
 * ONE-TIME MIGRATION: 5-star → 10-star card system.
 *
 * Old formula (max 5★): star_level = Math.min(5, 1 + dupes_collected)
 * New formula (max 10★, chosen in plan from src/game/cardLevels.js):
 *   star_level = Math.min(10, 1 + Math.floor(dupes_collected / 2))
 *   is_shiny   = star_level >= SHINY_STAR_LEVEL (10), OR already shiny (kept)
 *   MAXED (10★) corresponds to 18 dupes.
 *
 * Migration rules (no progress is ever lost):
 *   • Old maxed cards (star_level === 5 — the OLD max tier) are the new max tier:
 *       star_level = 10, dupes_collected = max(dupes, 18), is_shiny = true
 *     (maxed always earns the shiny per the plan; existing shinies preserved).
 *   • Every other normal card keeps its star level (its supera/old dupes still
 *     map to an equal-or-lower level under the new formula). As a safety net the
 *     new star is never computed below the stored value — upgrades only happen
 *     when the new formula yields a higher star.
 *   • Power/Ancient records are untouched (fully independent card types).
 *
 * Usage:
 *   node scripts/migrate_star_levels_10.js          <- audit only (read-only)
 *   node scripts/migrate_star_levels_10.js --migrate <- actually write the fixes
 *
 * Alternative: the SQL in scripts/migrate_star_levels_10.sql (run in the
 * Supabase Dashboard over all rows, bypassing RLS).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const envPath    = path.join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const USING_SERVICE_KEY = !!process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!USING_SERVICE_KEY) {
  console.warn('⚠️   WARNING: No SUPABASE_SERVICE_KEY in .env — running with the anon key,');
  console.warn('    RLS will restrict rows to the current user. Add SUPABASE_SERVICE_KEY to migrate all users.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MIGRATE = process.argv.includes('--migrate');
const BATCH_SIZE = 50;

const MAX_STAR_LEVEL = 10;
const SHINY_STAR_LEVEL = 10;
const MAXED_DUPES = 18;

const OLD_MAX_STAR = 5;

// ─── Migration helpers ───────────────────────────────────────────────────────
// New-formula star (never below the stored star: no downgrades).
function formulaStar(dupes, storedStar) {
  const computed = Math.min(MAX_STAR_LEVEL, 1 + Math.floor((dupes ?? 0) / 2));
  return Math.max(Number(storedStar) || 1, computed);
}

function migratedRow(row) {
  if (row.is_power_card || row.is_ancient_card) return null;

  // Old max tier → new max tier, always shiny at max.
  if (Number(row.star_level) === OLD_MAX_STAR) {
    return {
      id: row.id,
      user_id: row.user_id,
      pokemon_id: row.pokemon_id,
      dupes_collected: Math.max(Number(row.dupes_collected) || 0, MAXED_DUPES),
      star_level: MAX_STAR_LEVEL,
      is_shiny: true,
      updated_at: new Date().toISOString(),
    };
  }

  const newStar = formulaStar(row.dupes_collected, row.star_level);
  const newShiny = Boolean(row.is_shiny) || newStar >= SHINY_STAR_LEVEL;
  if (newStar === Number(row.star_level) && newShiny === Boolean(row.is_shiny)) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    pokemon_id: row.pokemon_id,
    dupes_collected: row.dupes_collected,
    star_level: newStar,
    is_shiny: newShiny,
    updated_at: new Date().toISOString(),
  };
}

async function fetchAllRows() {
  let allRows = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('collections')
      .select('id, user_id, pokemon_id, dupes_collected, star_level, is_shiny, is_power_card, is_ancient_card')
      .range(from, from + PAGE - 1)
      .order('id', { ascending: true });
    if (error) {
      console.error('❌  Fetch error:', error.message);
      process.exit(1);
    }
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return allRows;
}

// ─── PHASE 1: AUDIT ──────────────────────────────────────────────────────────
async function audit() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 1 — AUDIT (read-only)');
  console.log('══════════════════════════════════════════════════════\n');

  const rows = await fetchAllRows();
  console.log(`Total rows in collections: ${rows.length}`);

  const changes = rows.map(migratedRow).filter(Boolean);
  const maxed = changes.filter((r) => r.star_level === MAX_STAR_LEVEL && Number.isFinite(r.star_level));
  const others = changes.filter((r) => r.star_level !== MAX_STAR_LEVEL);

  console.log(`Normal (non-special) rows: ${rows.length - rows.filter((r) => r.is_power_card || r.is_ancient_card).length}`);
  console.log(`Rows to upgrade 5★ → 10★ (+shiny): ${maxed.length}`);
  console.log(`Rows to touch otherwise (formula upgrade/shiny): ${others.length}`);

  const sample = changes.slice(0, 20);
  if (sample.length > 0) {
    console.log('\n--- Sample of rows that would change (up to 20) ---');
    console.log(`${'pokemon_id'.padEnd(10)} ${'dupes'.padEnd(7)} ${'star→star'.padEnd(13)} ${'shiny→shiny'}`);
    console.log('─'.repeat(55));
    for (const r of sample) {
      const before = rows.find((x) => x.id === r.id);
      console.log(
        `${String(r.pokemon_id).padEnd(10)} ` +
        `${String(before.dupes_collected ?? 0).padEnd(7)} ` +
        `${String(before.star_level).padEnd(4)}→${String(r.star_level).padEnd(5)} ` +
        `${String(before.is_shiny).padEnd(8)}→${String(r.is_shiny)}`
      );
    }
  }

  return { changes, rows };
}

// ─── PHASE 2: MIGRATE ────────────────────────────────────────────────────────
async function migrate(changes) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 2 — MIGRATE (writing to collections)');
  console.log('══════════════════════════════════════════════════════\n');

  const beforeSnapshots = changes.slice(0, 10).map((r) => {
    const before = changes[0] ? r : r;
    return before;
  });
  const beforeLookup = new Map();

  let updated = 0;
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('collections')
      .upsert(batch, { onConflict: 'id' })
      .select('id, pokemon_id, dupes_collected, star_level, is_shiny');
    if (error) {
      console.error(`❌  Upsert error at batch ${i}:`, error.message);
      process.exit(1);
    }
    (data || []).forEach((r) => beforeLookup.set(r.id, r));
    updated += batch.length;
    process.stdout.write(`\r  Updated ${updated} / ${changes.length} rows...`);
  }
  console.log(`\n\n✅  Migration complete. ${updated} rows updated.`);

  return { beforeSnapshots, beforeLookup };
}

// ─── PHASE 3: VERIFY ─────────────────────────────────────────────────────────
async function verify(beforeLookup, originalRows) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 3 — BEFORE / AFTER VERIFICATION');
  console.log('══════════════════════════════════════════════════════\n');

  const sampleIds = [...beforeLookup.keys()].slice(0, 10);
  if (sampleIds.length === 0) return;
  const { data: afterRows } = await supabase
    .from('collections')
    .select('id, pokemon_id, dupes_collected, star_level, is_shiny')
    .in('id', sampleIds);
  const afterMap = new Map((afterRows || []).map((r) => [r.id, r]));
  const beforeMap = new Map(originalRows.map((r) => [r.id, r]));

  console.log(`${'pokemon_id'.padEnd(10)} ${'dupes'.padEnd(7)} ${'star(before)'.padEnd(12)} ${'star(after)'.padEnd(11)} ${'shiny(before)'.padEnd(13)} ${'shiny(after)'}`);
  console.log('─'.repeat(65));
  for (const id of sampleIds) {
    const b = beforeMap.get(id) || {};
    const a = afterMap.get(id) || {};
    console.log(
      `${String(b.pokemon_id).padEnd(10)} ` +
      `${String(b.dupes_collected ?? 0).padEnd(7)} ` +
      `${String(b.star_level).padEnd(12)} ` +
      `${String(a.star_level).padEnd(11)} ` +
      `${String(b.is_shiny).padEnd(13)} ` +
      `${String(a.is_shiny)}`
    );
  }
  console.log();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n Pokedex — 5★→10★ Star Level Migration');
  console.log(`    Mode: ${MIGRATE ? 'MIGRATE (will write to DB)' : 'AUDIT ONLY (read-only)'}`);
  console.log('    Rule: old maxed 5★ → 10★ + shiny; others never downgrade\n');

  const { changes, rows } = await audit();

  if (!MIGRATE) {
    if (changes.length > 0) {
      console.log('\n  Re-run with --migrate to apply the fixes:');
      console.log('    node scripts/migrate_star_levels_10.js --migrate\n');
    }
    return;
  }

  if (changes.length === 0) {
    console.log('Nothing to do. Exiting.\n');
    return;
  }

  const { beforeLookup } = await migrate(changes);
  await verify(beforeLookup, rows);
  console.log('All done!\n');
})();
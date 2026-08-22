/**
 * ONE-TIME MIGRATION: Fix out-of-sync star_level / is_shiny in "collections" table.
 *
 * Current formula (from src/store/collection.js):
 *   star_level = Math.min(5, 1 + Math.floor(dupes_collected / 5))
 *   is_shiny   = star_level >= 5  (OR already was shiny, keep it true)
 *
 * This script:
 *   1. PHASE 1 – AUDIT: Fetches all rows and reports ones where stored
 *      star_level or is_shiny doesn't match the formula.
 *   2. PHASE 2 – MIGRATE: (only runs if --migrate flag is passed)
 *      Batch-updates every bad row with correct values.
 *   3. PHASE 3 – VERIFY: Re-fetches the rows that were updated and prints
 *      before/after for the first 10.
 *
 * Usage:
 *   node scripts/migrate_star_levels.js          <- audit only (safe, read-only)
 *   node scripts/migrate_star_levels.js --migrate <- actually fix the data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ─── Load .env manually (no dotenv dependency needed) ────────────────────────
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

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Prefer the service-role key so RLS is bypassed and we see ALL users' rows.
// Add SUPABASE_SERVICE_KEY=<service_role_key> to .env to enable this.
// The service role key is in: Supabase Dashboard > Project Settings > API > service_role (secret)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const USING_SERVICE_KEY = !!process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!USING_SERVICE_KEY) {
  console.warn('⚠️   WARNING: No SUPABASE_SERVICE_KEY found in .env.');
  console.warn('    Running with the anon key — RLS will filter rows to the current user only.');
  console.warn('    Add SUPABASE_SERVICE_KEY=<service_role_key> to .env to migrate ALL users.\n');
  console.warn('    Alternatively, run scripts/migrate_star_levels.sql directly in the');
  console.warn('    Supabase Dashboard > SQL Editor (bypasses RLS automatically).\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MIGRATE = process.argv.includes('--migrate');
const BATCH_SIZE = 50; // Supabase upsert batch size

// ─── Formula (must match src/store/collection.js exactly) ────────────────────
function correctStarLevel(dupes_collected) {
  // Each dupe = +1 star, max 5 stars (reached at 4 dupes)
  return Math.min(5, 1 + (dupes_collected ?? 0));
}

function correctIsShiny(star_level, existing_is_shiny) {
  // Once shiny, always shiny.  Also set shiny when star_level hits 5.
  return existing_is_shiny || star_level >= 5;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isInconsistent(row) {
  const expectedStar = correctStarLevel(row.dupes_collected);
  const expectedShiny = correctIsShiny(expectedStar, row.is_shiny);
  return row.star_level !== expectedStar || row.is_shiny !== expectedShiny;
}

async function fetchAllRows() {
  // Paginate to handle large tables (Supabase default limit is 1000)
  let allRows = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('collections')
      .select('id, user_id, pokemon_id, dupes_collected, star_level, is_shiny')
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

  const bad = rows.filter(isInconsistent);

  if (bad.length === 0) {
    console.log('\n✅  All rows are already consistent. Nothing to migrate.\n');
    return { rows, bad };
  }

  console.log(`\n⚠️   Found ${bad.length} inconsistent row(s).\n`);

  // Show a sample of up to 20 bad rows
  const sample = bad.slice(0, 20);
  console.log('--- Sample of inconsistent rows (up to 20) ---');
  console.log(
    `${'pokemon_id'.padEnd(12)} ${'dupes'.padEnd(7)} ${'stored_star'.padEnd(13)} ${'expected_star'.padEnd(15)} ${'stored_shiny'.padEnd(14)} ${'expected_shiny'}`
  );
  console.log('─'.repeat(80));
  for (const row of sample) {
    const expStar = correctStarLevel(row.dupes_collected);
    const expShiny = correctIsShiny(expStar, row.is_shiny);
    const starMark  = row.star_level !== expStar  ? '<- BAD' : '';
    const shinyMark = row.is_shiny   !== expShiny ? '<- BAD' : '';
    console.log(
      `${String(row.pokemon_id).padEnd(12)} ` +
      `${String(row.dupes_collected).padEnd(7)} ` +
      `${String(row.star_level).padEnd(13)} ` +
      `${String(expStar).padEnd(15)} ` +
      `${String(row.is_shiny).padEnd(14)} ` +
      `${String(expShiny).padEnd(6)} ${starMark} ${shinyMark}`
    );
  }

  // Breakdown by mismatch type
  const starOnly = bad.filter(r => {
    const e = correctStarLevel(r.dupes_collected);
    const es = correctIsShiny(e, r.is_shiny);
    return r.star_level !== e && r.is_shiny === es;
  });
  const shinyOnly = bad.filter(r => {
    const e = correctStarLevel(r.dupes_collected);
    const es = correctIsShiny(e, r.is_shiny);
    return r.star_level === e && r.is_shiny !== es;
  });
  const both = bad.filter(r => {
    const e = correctStarLevel(r.dupes_collected);
    const es = correctIsShiny(e, r.is_shiny);
    return r.star_level !== e && r.is_shiny !== es;
  });

  console.log('\n--- Mismatch Breakdown ---');
  console.log(`  star_level only wrong : ${starOnly.length}`);
  console.log(`  is_shiny only wrong   : ${shinyOnly.length}`);
  console.log(`  both wrong            : ${both.length}`);

  return { rows, bad };
}

// ─── PHASE 2: MIGRATE ────────────────────────────────────────────────────────
async function migrate(bad) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 2 — MIGRATE');
  console.log('══════════════════════════════════════════════════════\n');

  // Save before snapshots for reporting
  const beforeSnapshots = bad.slice(0, 10).map(r => ({ ...r }));

  // Build corrected rows
  const corrected = bad.map(row => {
    const newStar  = correctStarLevel(row.dupes_collected);
    const newShiny = correctIsShiny(newStar, row.is_shiny);
    return {
      id:              row.id,
      user_id:         row.user_id,
      pokemon_id:      row.pokemon_id,
      dupes_collected: row.dupes_collected,
      star_level:      newStar,
      is_shiny:        newShiny,
      updated_at:      new Date().toISOString(),
    };
  });

  // Batch upsert
  let updated = 0;
  for (let i = 0; i < corrected.length; i += BATCH_SIZE) {
    const batch = corrected.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('collections')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌  Upsert error at batch starting index ${i}:`, error.message);
      process.exit(1);
    }
    updated += batch.length;
    process.stdout.write(`\r  Updated ${updated} / ${corrected.length} rows...`);
  }
  console.log(`\n\n✅  Migration complete. ${updated} rows updated.`);

  return { beforeSnapshots, correctedIds: corrected.map(r => r.id) };
}

// ─── PHASE 3: VERIFY ─────────────────────────────────────────────────────────
async function verify(beforeSnapshots, correctedIds) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 3 — BEFORE / AFTER VERIFICATION (first 10)');
  console.log('══════════════════════════════════════════════════════\n');

  // Fetch the updated rows for the sample IDs
  const sampleIds = correctedIds.slice(0, 10);
  const { data: afterRows, error } = await supabase
    .from('collections')
    .select('id, pokemon_id, dupes_collected, star_level, is_shiny')
    .in('id', sampleIds);

  if (error) {
    console.error('❌  Verify fetch error:', error.message);
    return;
  }

  const afterMap = new Map(afterRows.map(r => [r.id, r]));

  console.log(
    `${'pokemon_id'.padEnd(12)} ${'dupes'.padEnd(7)} ` +
    `${'star(before)'.padEnd(13)} ${'star(after)'.padEnd(13)} ` +
    `${'shiny(before)'.padEnd(15)} ${'shiny(after)'}`
  );
  console.log('─'.repeat(80));

  for (const before of beforeSnapshots) {
    const after = afterMap.get(before.id);
    if (!after) continue;
    const starOk  = before.star_level !== after.star_level ? '[FIXED]' : '[same]';
    const shinyOk = before.is_shiny   !== after.is_shiny   ? '[FIXED]' : '[same]';
    console.log(
      `${String(before.pokemon_id).padEnd(12)} ` +
      `${String(before.dupes_collected).padEnd(7)} ` +
      `${String(before.star_level).padEnd(13)} ` +
      `${String(after.star_level).padEnd(13)} ` +
      `${String(before.is_shiny).padEnd(15)} ` +
      `${String(after.is_shiny).padEnd(8)} star:${starOk} shiny:${shinyOk}`
    );
  }
  console.log();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n Pokedex Collections - Star Level Migration Script');
  console.log(`    Mode: ${MIGRATE ? 'MIGRATE (will write to DB)' : 'AUDIT ONLY (read-only)'}`);
  console.log('    Formula: star_level = Math.min(5, 1 + Math.floor(dupes_collected / 5))');
  console.log('             is_shiny   = star_level >= 5 (or already was shiny)\n');

  const { bad } = await audit();

  if (!MIGRATE) {
    if (bad.length > 0) {
      console.log('\n  Re-run with --migrate to apply the fixes:');
      console.log('    node scripts/migrate_star_levels.js --migrate\n');
    }
    return;
  }

  if (bad.length === 0) {
    console.log('Nothing to do. Exiting.\n');
    return;
  }

  const { beforeSnapshots, correctedIds } = await migrate(bad);
  await verify(beforeSnapshots, correctedIds);

  console.log('All done!\n');
})();

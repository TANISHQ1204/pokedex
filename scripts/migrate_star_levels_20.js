/**
 * ONE-TIME MIGRATION: legacy star data -> 20-star card system.
 *
 * New rules (src/game/cardLevels.js):
 *   star_level = min(20, 1 + dupes_collected)
 *   shiny      = star_level >= 20 (or previously earned)
 *
 * No card ever loses progress:
 *   - Duplicate counts are raised to at least star_level - 1.
 *   - Stored star levels are preserved and only upgraded.
 *   - Power/Ancient cards are untouched.
 *
 * Usage:
 *   node scripts/migrate_star_levels_20.js               <- audit only (read-only)
 *   node scripts/migrate_star_levels_20.js --migrate     <- write fixes
 *
 * SQL alternative: scripts/migrate_star_levels_20.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';
import { summarizeStarMigration } from '../src/game/starMigration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');
const BATCH_SIZE = 50;

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
const USING_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_KEY);
const MIGRATE = process.argv.includes('--migrate');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!USING_SERVICE_KEY) {
  console.warn('WARNING: SUPABASE_SERVICE_KEY is not set.');
  console.warn('The anon key is RLS-limited and may only migrate the current user.');
  console.warn('For all users, prefer scripts/migrate_star_levels_20.sql in the Supabase SQL editor.\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAllRows() {
  const rows = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('collections')
      .select('id, user_id, pokemon_id, dupes_collected, star_level, is_shiny, is_power_card, is_ancient_card')
      .range(from, from + PAGE - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error('Fetch error:', error.message);
      process.exit(1);
    }

    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

async function applyChanges(changes) {
  let updated = 0;

  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('collections')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`\nUpsert error at batch ${i}:`, error.message);
      process.exit(1);
    }

    updated += batch.length;
    process.stdout.write(`\rUpdated ${updated} / ${changes.length} rows...`);
  }

  console.log(`\nMigration complete: ${updated} rows updated.`);
}

(async () => {
  console.log('\nPokedex 20-Star Migration');
  console.log(`Mode: ${MIGRATE ? 'MIGRATE (writes enabled)' : 'AUDIT ONLY (read-only)'}\n`);

  const rows = await fetchAllRows();
  const summary = summarizeStarMigration(rows);

  console.log(`Total rows: ${summary.total}`);
  console.log(`Normal rows: ${summary.normal}`);
  console.log(`Rows needing changes: ${summary.changes.length}`);
  console.log(`Rows reaching ${MAX_STAR_LEVEL} stars: ${summary.maxed}`);
  console.log(`Newly shiny rows: ${summary.shinyUnlocked}`);

  if (summary.changes.length === 0) {
    console.log('\nNothing to migrate.');
    return;
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  console.log('\nSample changes (up to 10):');
  summary.changes.slice(0, 10).forEach((change) => {
    const before = byId.get(change.id) || {};
    console.log(
      `  #${String(before.pokemon_id ?? '?').padEnd(5)} ` +
      `${String(before.star_level ?? 1).padStart(2)}★/${String(before.dupes_collected ?? 0).padStart(2)} dupes/shiny=${String(Boolean(before.is_shiny)).padEnd(5)} ` +
      `-> ${String(change.star_level).padStart(2)}★/${String(change.dupes_collected).padStart(2)} dupes/shiny=${change.is_shiny}`
    );
  });

  if (!MIGRATE) {
    console.log('\nAudit complete. Re-run with --migrate to apply these changes.');
    return;
  }

  await applyChanges(summary.changes);
})();

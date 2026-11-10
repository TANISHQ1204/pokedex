-- ============================================================
--  ARCADE 3-CARD CLAIM FAILURE — DIAGNOSTIC & REPAIR
--  Run in: Supabase Dashboard > SQL Editor
-- ============================================================
-- Symptom: arcade runs that award 3 cards fail on claim ("Rewards could
-- not be saved"), while 1-2 card pulls succeed. The 3-card path always
-- includes one UNDISCOVERED card, which is awarded via an INSERT (new row)
-- instead of an UPDATE (existing row). If INSERTs into `collections` are
-- rejected, every 3-card claim dies while most 1-2 card pulls keep working.
--
-- Two known suspects:
--   A) No INSERT policy on `collections` for RLS (all new-card inserts fail).
--   B) A FK/CHECK on pokemon_id that rejects alternate-form ids (10001+).
--
-- Run the AUDIT section first, then only the APPLY block that matches.

-- ============================================================
-- AUDIT (read-only)
-- ============================================================

-- 1. Do alternate-form rows (ids 10001+) exist at all? Zero rows means
--    every historical form award failed -> suspect B is very likely.
select
  count(*) filter (where pokemon_id >= 10001) as form_rows,
  count(*) filter (where pokemon_id < 10001) as species_rows
from public.collections;

-- 2. Every constraint on the table. Look for FOREIGN KEY or CHECK on pokemon_id.
select
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.collections'::regclass
order by contype, conname;

-- 3. If a FK exists, find the reference table and check whether it contains
--    the form ids. Replace <reference_table> with the table named in step 2.
-- select count(*) from public.<reference_table> where id >= 10001;

-- 4. RLS status and policies. INSERTs need a FOR INSERT policy.
select
  relrowsecurity as rls_enabled
from pg_tables
where schemaname = 'public' and tablename = 'collections';

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public' and tablename = 'collections'
order by policyname;

-- 5. Non-destructive INSERT probe (rolls back, writes nothing).
--    Replace <your-user-id> with your auth.users id. If this errors,
--    the error text is the root cause of the 3-card claim failure.
begin;
insert into public.collections (user_id, pokemon_id, star_level, dupes_collected, is_shiny)
values ('<your-user-id>', 10001, 1, 0, false)
returning id, pokemon_id;
rollback;

-- ============================================================
-- APPLY A — restore owner-scoped RLS policies on `collections`
-- (run this if AUDIT 4 shows no FOR INSERT policy)
-- ============================================================
-- Mirrors the battle_history / card_pulls policies in
-- create_analytics_tables.sql: without them the anon key can neither
-- insert nor read rows, so every new-card award fails.

alter table public.collections enable row level security;

drop policy if exists "Users can insert their own collection rows" on public.collections;
create policy "Users can insert their own collection rows"
  on public.collections for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own collection rows" on public.collections;
create policy "Users can view their own collection rows"
  on public.collections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own collection rows" on public.collections;
create policy "Users can update their own collection rows"
  on public.collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own collection rows" on public.collections;
create policy "Users can delete their own collection rows"
  on public.collections for delete
  using (auth.uid() = user_id);

-- ============================================================
-- APPLY B — if AUDIT 2/3 shows a FK to a pokemon reference table
-- that lacks the alternate-form ids (10001+), either seed it or drop it.
-- ============================================================

-- Option B1 (preferred): seed the reference table with all form ids.
-- The app's authoritative form list lives in src/data/forms.json
-- (ids 10001..10231). Replace <reference_table> accordingly, e.g.:
-- insert into public.<reference_table> (id)
-- select g
-- from generate_series(10001, 10231) as g
-- on conflict do nothing;

-- Option B2: drop the FK if the reference data cannot be maintained.
-- alter table public.collections
--   drop constraint if exists <constraint_name_from_audit_2>;

-- ============================================================
-- VERIFY — re-run the AUDIT 5 probe after applying the fix.
-- It must return the inserted row (id, 10001) without erroring.
-- ============================================================

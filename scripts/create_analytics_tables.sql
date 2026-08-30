-- ============================================================
--  ANALYTICS / STATS TABLES — Run in: Supabase Dashboard > SQL Editor
-- ============================================================
-- Adds per-user battle history + card pull feed tracking.
-- Stats are computed client-side from these rows (no server functions).
-- NOTE: These tables only capture activity AFTER initial deployment;
-- past battles/card pulls were not logged and cannot be rebuilt retroactively.
-- Also includes owner-scoped ROW LEVEL SECURITY policies (required for the app's
-- anon key to insert/read via the browser).
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. battle_history — one row per completed battle (solo CPU or friend)
-- ---------------------------------------------------------------------------
create table if not exists public.battle_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  result         text not null check (result in ('won', 'lost', 'draw')),
  mode           text not null default 'solo' check (mode in ('solo', 'friend')),
  opponent_type  text not null default 'cpu' check (opponent_type in ('cpu', 'friend')),
  opponent_id    uuid,
  opponent_name  text,
  opponent_team  jsonb,     -- array of Pokemon species ids the user faced
  player_team    jsonb,     -- array of Pokemon species ids the user used
  turns          integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Index for per-user history queries (used by the Stats page / Home widget)
create index if not exists battle_history_user_created_idx
  on public.battle_history (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 1a. ROW LEVEL SECURITY for battle_history (CRITICAL)
-- ---------------------------------------------------------------------------
-- Supabase enables RLS on newly created tables by default. Without the
-- policies below, the anon key (used by the app) can neither insert nor read
-- any row, so every battle silently fails to record AND the Stats page reads
-- back nothing — which looks exactly like "battle stats are empty".
-- These policies restrict each user to only their own rows.
alter table public.battle_history enable row level security;

drop policy if exists "Users can insert their own battles" on public.battle_history;
create policy "Users can insert their own battles"
  on public.battle_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own battles" on public.battle_history;
create policy "Users can view their own battles"
  on public.battle_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own battles" on public.battle_history;
create policy "Users can update their own battles"
  on public.battle_history for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own battles" on public.battle_history;
create policy "Users can delete their own battles"
  on public.battle_history for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. card_pulls — one row per card obtained (normal, power, or ancient)
--    Powers the recent-pulls feed.
-- ---------------------------------------------------------------------------
create table if not exists public.card_pulls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  pokemon_id  integer not null,
  card_type   text not null check (card_type in ('normal', 'power', 'ancient')),
  star_level  integer not null default 1,
  is_shiny    boolean not null default false,
  was_new     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists card_pulls_user_created_idx
  on public.card_pulls (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2a. ROW LEVEL SECURITY for card_pulls
-- ---------------------------------------------------------------------------
-- Same reasoning as battle_history: without these policies the anon key cannot
-- record card pulls, so the Home "Top Collection Showcase" and Stats "Cards
-- Pulled" count rely solely on backfilled collection records and never see new
-- live pulls.
alter table public.card_pulls enable row level security;

drop policy if exists "Users can insert their own card pulls" on public.card_pulls;
create policy "Users can insert their own card pulls"
  on public.card_pulls for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own card pulls" on public.card_pulls;
create policy "Users can view their own card pulls"
  on public.card_pulls for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own card pulls" on public.card_pulls;
create policy "Users can update their own card pulls"
  on public.card_pulls for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own card pulls" on public.card_pulls;
create policy "Users can delete their own card pulls"
  on public.card_pulls for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RECOMMENDED (but OPTIONAL): enforce card-type independence at the DB level.
-- ---------------------------------------------------------------------------
-- The app UI (Normal/Power/Ancient) treats each Pokemon's three card types as
-- fully independent records. If your current `collections` table only has a
-- plain UNIQUE(user_id, pokemon_id) constraint, it is impossible for a Pokemon
-- to own more than one card type at once — which breaks the drop independence
-- rules. Run the block below to guarantee one row per (user, pokemon, card type).
--
-- WARNING: Only run the CREATE UNIQUE INDEX statements if the matching plain
-- constraint does NOT already exist. If it does exist (and users currently own
-- multiple card types for the same Pokemon), remove that old constraint FIRST:
--
--   alter table public.collections drop constraint <old_unique_name>;
--
-- Drop any pre-existing plain unique constraint, then re-create as partial:
ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_user_id_pokemon_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS collections_normal_unique
  ON public.collections (user_id, pokemon_id)
  WHERE (is_power_card = false OR is_power_card IS NULL)
    AND (is_ancient_card = false OR is_ancient_card IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS collections_power_unique
  ON public.collections (user_id, pokemon_id)
  WHERE (is_power_card = true);

CREATE UNIQUE INDEX IF NOT EXISTS collections_ancient_unique
  ON public.collections (user_id, pokemon_id)
  WHERE (is_ancient_card = true);
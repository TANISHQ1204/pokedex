-- ONE-TIME MIGRATION: remove Power/Ancient cards from the collection system.
--
-- Run this in Supabase Dashboard > SQL Editor before deploying the app code
-- that stops writing the special-card columns. The special columns are kept
-- until scripts/drop_power_ancient_columns.sql is run after deployment.
--
-- This script is safe to re-run. It:
--   1. Archives every Power/Ancient collection row.
--   2. Deletes the archived special rows from public.collections.
--   3. Merges duplicate normal rows for the same (user_id, pokemon_id).
--   4. Replaces the partial unique indexes with one plain unique index.

begin;

-- ---------------------------------------------------------------------------
-- 1. Archive special-card collection rows
-- ---------------------------------------------------------------------------
create table if not exists public.collections_power_ancient_archive
  (like public.collections including all);

alter table public.collections_power_ancient_archive
  add column if not exists archived_at timestamptz not null default now();

insert into public.collections_power_ancient_archive
select c.*, now()
from public.collections c
where (coalesce(c.is_power_card, false) or coalesce(c.is_ancient_card, false))
  and not exists (
    select 1
    from public.collections_power_ancient_archive a
    where a.id = c.id
  );

-- ---------------------------------------------------------------------------
-- 2. Delete the special rows now that they are archived
-- ---------------------------------------------------------------------------
delete from public.collections c
where coalesce(c.is_power_card, false)
   or coalesce(c.is_ancient_card, false);

-- ---------------------------------------------------------------------------
-- 3. Merge duplicate normal rows (old upsert bug recovery)
-- ---------------------------------------------------------------------------
drop table if exists _collections_normal_dedupe_plan;

create temp table _collections_normal_dedupe_plan as
with grouped as (
  select
    user_id,
    pokemon_id,
    count(*)::int as row_count,
    max(coalesce(star_level, 1))::int as max_star,
    max(greatest(coalesce(dupes_collected, 0), 0))::int as max_dupes,
    bool_or(coalesce(is_shiny, false)) as any_shiny
  from public.collections
  group by user_id, pokemon_id
),
ranked as (
  select
    id,
    user_id,
    pokemon_id,
    row_number() over (
      partition by user_id, pokemon_id
      order by
        coalesce(star_level, 1) desc,
        greatest(coalesce(dupes_collected, 0), 0) desc,
        coalesce(updated_at, created_at, to_timestamp(0)) desc,
        id desc
    ) as rn
  from public.collections
)
select
  g.user_id,
  g.pokemon_id,
  g.row_count,
  g.max_star,
  g.max_dupes,
  g.any_shiny,
  least(20, greatest(g.max_star, g.row_count)) as recovered_star,
  r.id as keeper_id
from grouped g
join ranked r
  on r.user_id = g.user_id
 and r.pokemon_id = g.pokemon_id
 and r.rn = 1
where g.row_count > 1;

update public.collections c
set
  star_level = p.recovered_star,
  dupes_collected = least(19, greatest(p.max_dupes, p.recovered_star - 1)),
  is_shiny = (p.any_shiny or p.recovered_star >= 20),
  updated_at = now()
from _collections_normal_dedupe_plan p
where c.id = p.keeper_id;

delete from public.collections c
using _collections_normal_dedupe_plan p
where c.user_id = p.user_id
  and c.pokemon_id = p.pokemon_id
  and c.id <> p.keeper_id;

drop table if exists _collections_normal_dedupe_plan;

-- ---------------------------------------------------------------------------
-- 4. Replace partial unique indexes with one plain unique index
-- ---------------------------------------------------------------------------
alter table public.collections
  drop constraint if exists collections_user_id_pokemon_id_key;

drop index if exists public.collections_normal_unique;
drop index if exists public.collections_power_unique;
drop index if exists public.collections_ancient_unique;

create unique index if not exists collections_user_id_pokemon_id_key
  on public.collections (user_id, pokemon_id);

commit;

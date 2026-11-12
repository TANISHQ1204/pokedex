-- ONE-TIME REPAIR: merge duplicate collection rows created by the old upsert bug.
--
-- Run the AUDIT section first to see how many groups are affected, then run the
-- APPLY section in Supabase Dashboard > SQL Editor. The apply block is safe to
-- re-run: groups with a single row are ignored.
--
-- Recovery rules:
--   star_level       = min(20, max(highest stored star, number of rows))
--   dupes_collected  = min(19, max(highest stored dupes, star_level - 1))
--   is_shiny         = any stored shiny OR star_level >= 20
--
-- After merging, one plain unique index protects future writes.

-- ---------------------------------------------------------------------------
-- AUDIT (read-only)
-- ---------------------------------------------------------------------------
select
  user_id,
  pokemon_id,
  count(*) as row_count,
  max(coalesce(star_level, 1)) as highest_star,
  max(greatest(coalesce(dupes_collected, 0), 0)) as highest_dupes
from public.collections
group by user_id, pokemon_id
having count(*) > 1
order by row_count desc, user_id, pokemon_id;

-- ---------------------------------------------------------------------------
-- APPLY (writes)
-- ---------------------------------------------------------------------------
begin;

drop table if exists _collections_dedupe_plan;

create temp table _collections_dedupe_plan as
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
from _collections_dedupe_plan p
where c.id = p.keeper_id;

delete from public.collections c
using _collections_dedupe_plan p
where c.user_id = p.user_id
  and c.pokemon_id = p.pokemon_id
  and c.id <> p.keeper_id;

drop table _collections_dedupe_plan;

alter table public.collections
  drop constraint if exists collections_user_id_pokemon_id_key;

drop index if exists public.collections_normal_unique;
drop index if exists public.collections_power_unique;
drop index if exists public.collections_ancient_unique;

create unique index if not exists collections_user_id_pokemon_id_key
  on public.collections (user_id, pokemon_id);

commit;

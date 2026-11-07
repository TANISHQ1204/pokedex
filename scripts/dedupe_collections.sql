-- ONE-TIME REPAIR: merge duplicate collection rows created by the old upsert bug.
--
-- Run the AUDIT section first to see how many groups are affected, then run the
-- APPLY section in Supabase Dashboard > SQL Editor. The apply block is safe to
-- re-run: groups with a single row are ignored.
--
-- Recovery rules for NORMAL cards:
--   star_level       = min(20, max(highest stored star, number of rows))
--   dupes_collected  = min(19, max(highest stored dupes, star_level - 1))
--   is_shiny         = any stored shiny OR star_level >= 20
-- Power/Ancient rows keep their single best row (shiny then newest).
--
-- After merging, the partial unique indexes are recreated so future writes are
-- protected at the database level.

-- ---------------------------------------------------------------------------
-- AUDIT (read-only)
-- ---------------------------------------------------------------------------
select
  case
    when coalesce(is_power_card, false) then 'power'
    when coalesce(is_ancient_card, false) then 'ancient'
    else 'normal'
  end as card_type,
  user_id,
  pokemon_id,
  count(*) as row_count,
  max(coalesce(star_level, 1)) as highest_star,
  max(greatest(coalesce(dupes_collected, 0), 0)) as highest_dupes
from public.collections
group by card_type, user_id, pokemon_id
having count(*) > 1
order by row_count desc, user_id, pokemon_id;

-- ---------------------------------------------------------------------------
-- APPLY (writes)
-- ---------------------------------------------------------------------------
begin;

drop table if exists _collections_dedupe_plan;

create temp table _collections_dedupe_plan as
with typed as (
  select
    c.*,
    case
      when coalesce(c.is_power_card, false) then 'power'
      when coalesce(c.is_ancient_card, false) then 'ancient'
      else 'normal'
    end as card_type
  from public.collections c
),
grouped as (
  select
    user_id,
    pokemon_id,
    card_type,
    count(*)::int as row_count,
    max(coalesce(star_level, 1))::int as max_star,
    max(greatest(coalesce(dupes_collected, 0), 0))::int as max_dupes,
    bool_or(coalesce(is_shiny, false)) as any_shiny
  from typed
  group by user_id, pokemon_id, card_type
),
ranked as (
  select
    id,
    user_id,
    pokemon_id,
    card_type,
    row_number() over (
      partition by user_id, pokemon_id, card_type
      order by
        coalesce(star_level, 1) desc,
        greatest(coalesce(dupes_collected, 0), 0) desc,
        coalesce(updated_at, created_at, to_timestamp(0)) desc,
        id desc
    ) as rn
  from typed
)
select
  g.user_id,
  g.pokemon_id,
  g.card_type,
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
 and r.card_type = g.card_type
 and r.rn = 1
where g.row_count > 1;

update public.collections c
set
  star_level = case
    when p.card_type = 'normal' then p.recovered_star
    else coalesce(c.star_level, 1)
  end,
  dupes_collected = case
    when p.card_type = 'normal' then least(19, greatest(p.max_dupes, p.recovered_star - 1))
    else coalesce(c.dupes_collected, 0)
  end,
  is_shiny = case
    when p.card_type = 'normal' then (p.any_shiny or p.recovered_star >= 20)
    else coalesce(c.is_shiny, false)
  end,
  updated_at = now()
from _collections_dedupe_plan p
where c.id = p.keeper_id;

delete from public.collections c
using _collections_dedupe_plan p
where c.user_id = p.user_id
  and c.pokemon_id = p.pokemon_id
  and c.id <> p.keeper_id
  and (
    (p.card_type = 'normal' and not coalesce(c.is_power_card, false) and not coalesce(c.is_ancient_card, false))
    or (p.card_type = 'power' and coalesce(c.is_power_card, false))
    or (p.card_type = 'ancient' and coalesce(c.is_ancient_card, false))
  );

drop table _collections_dedupe_plan;

-- Recreate the partial unique indexes (safe after duplicates are removed).
alter table public.collections
  drop constraint if exists collections_user_id_pokemon_id_key;

create unique index if not exists collections_normal_unique
  on public.collections (user_id, pokemon_id)
  where (is_power_card = false or is_power_card is null)
    and (is_ancient_card = false or is_ancient_card is null);

create unique index if not exists collections_power_unique
  on public.collections (user_id, pokemon_id)
  where (is_power_card = true);

create unique index if not exists collections_ancient_unique
  on public.collections (user_id, pokemon_id)
  where (is_ancient_card = true);

commit;

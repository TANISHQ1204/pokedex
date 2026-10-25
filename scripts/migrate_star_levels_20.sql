-- ONE-TIME MIGRATION: legacy star data -> 20-star card system.
-- Run in Supabase Dashboard > SQL Editor (bypasses RLS).
-- Safe to re-run. Power Cards and Ancient Cards are untouched.
--
-- Rules:
--   star_level = min(20, 1 + dupes_collected)
--   shiny      = previously earned OR star_level >= 20
--   dupes      = max(existing dupes, star_level - 1), capped at 19
--   Stars are never downgraded.

with source as (
  select
    id,
    coalesce(star_level, 1) as old_star,
    greatest(coalesce(dupes_collected, 0), 0) as old_dupes,
    coalesce(is_shiny, false) as old_shiny
  from collections
  where coalesce(is_power_card, false) = false
    and coalesce(is_ancient_card, false) = false
),
calculated as (
  select
    id,
    old_star,
    old_shiny,
    case
      -- Legacy 10-star maxed cards stay maxed at 20 stars.
      when old_star = 10 and old_dupes >= 18 then 19
      else least(19, greatest(old_dupes, least(19, old_star - 1)))
    end as new_dupes
  from source
),
final_values as (
  select
    id,
    new_dupes,
    case
      when old_star = 10 and new_dupes = 19 then 20
      else least(20, greatest(old_star, 1 + new_dupes))
    end as new_star,
    old_shiny
  from calculated
)
update collections as c
set
  dupes_collected = f.new_dupes,
  star_level = f.new_star,
  is_shiny = f.old_shiny or f.new_star >= 20,
  updated_at = now()
from final_values as f
where c.id = f.id
  and (
    c.dupes_collected is distinct from f.new_dupes
    or c.star_level is distinct from f.new_star
    or coalesce(c.is_shiny, false) is distinct from (f.old_shiny or f.new_star >= 20)
  );

-- Verification: every normal row should now satisfy the formula or be maxed.
-- select id, pokemon_id, star_level, dupes_collected, is_shiny
-- from collections
-- where coalesce(is_power_card, false) = false
--   and coalesce(is_ancient_card, false) = false
--   and star_level < least(20, 1 + dupes_collected)
-- order by id
-- limit 20;

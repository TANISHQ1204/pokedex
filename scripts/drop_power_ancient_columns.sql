-- PHASE 2: drop the Power/Ancient columns after the app no longer writes them.
--
-- Run this only after scripts/remove_power_ancient_cards.sql has completed and
-- the updated app code has been deployed. This script is safe to re-run.

begin;

-- ---------------------------------------------------------------------------
-- 1. Archive and remove special-card pull history
-- ---------------------------------------------------------------------------
create table if not exists public.card_pulls_power_ancient_archive
  (like public.card_pulls including all);

alter table public.card_pulls_power_ancient_archive
  add column if not exists archived_at timestamptz not null default now();

insert into public.card_pulls_power_ancient_archive
select p.*, now()
from public.card_pulls p
where p.card_type in ('power', 'ancient')
  and not exists (
    select 1
    from public.card_pulls_power_ancient_archive a
    where a.id = p.id
  );

delete from public.card_pulls p
where p.card_type in ('power', 'ancient');

-- Replace any card_type check constraint with a normal-only check.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.card_pulls'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%card_type%'
  loop
    execute format(
      'alter table public.card_pulls drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.card_pulls
  add constraint card_pulls_card_type_check check (card_type = 'normal');

-- ---------------------------------------------------------------------------
-- 2. Drop the special-card columns from collections
-- ---------------------------------------------------------------------------
drop index if exists public.collections_normal_unique;
drop index if exists public.collections_power_unique;
drop index if exists public.collections_ancient_unique;

create unique index if not exists collections_user_id_pokemon_id_key
  on public.collections (user_id, pokemon_id);

alter table public.collections
  drop column if exists is_power_card;

alter table public.collections
  drop column if exists is_ancient_card;

commit;

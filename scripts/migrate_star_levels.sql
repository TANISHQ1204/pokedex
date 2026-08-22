-- ============================================================
--  ONE-TIME MIGRATION: Fix star_level / is_shiny in collections
--  Run in: Supabase Dashboard > SQL Editor
--  Formula: star_level = LEAST(5, 1 + dupes_collected)
--           is_shiny   = star_level >= 5  (once shiny, stays shiny)
--  Rule: each dupe = +1 star; 4 dupes = 5 stars = shiny
-- ============================================================

-- STEP 1: AUDIT - see what is wrong BEFORE touching anything
SELECT
  id,
  pokemon_id,
  dupes_collected,
  star_level                                        AS star_stored,
  LEAST(5, 1 + dupes_collected::int)                AS star_expected,
  is_shiny                                          AS shiny_stored,
  (LEAST(5, 1 + dupes_collected::int) >= 5
    OR is_shiny)                                    AS shiny_expected,
  CASE
    WHEN star_level <> LEAST(5, 1 + dupes_collected::int)
     AND is_shiny   <> (LEAST(5, 1 + dupes_collected::int) >= 5 OR is_shiny)
    THEN 'BOTH WRONG'
    WHEN star_level <> LEAST(5, 1 + dupes_collected::int)
    THEN 'star_level wrong'
    WHEN is_shiny <> (LEAST(5, 1 + dupes_collected::int) >= 5 OR is_shiny)
    THEN 'is_shiny wrong'
    ELSE 'OK'
  END AS mismatch_type
FROM collections
WHERE
  star_level <> LEAST(5, 1 + dupes_collected::int)
  OR (LEAST(5, 1 + dupes_collected::int) >= 5 AND is_shiny = false)
ORDER BY mismatch_type, pokemon_id
LIMIT 50;


-- STEP 2: MIGRATE - fix all inconsistent rows (run only after confirming audit)
UPDATE collections
SET
  star_level = LEAST(5, 1 + dupes_collected::int),
  is_shiny   = (LEAST(5, 1 + dupes_collected::int) >= 5 OR is_shiny),
  updated_at = now()
WHERE
  star_level <> LEAST(5, 1 + dupes_collected::int)
  OR (LEAST(5, 1 + dupes_collected::int) >= 5 AND is_shiny = false);


-- STEP 3: VERIFY - re-run after UPDATE to confirm 0 bad rows remain
SELECT COUNT(*) AS remaining_bad_rows
FROM collections
WHERE
  star_level <> LEAST(5, 1 + dupes_collected::int)
  OR (LEAST(5, 1 + dupes_collected::int) >= 5 AND is_shiny = false);

-- Should return: remaining_bad_rows = 0

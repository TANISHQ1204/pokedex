# Pokedex

A Pokemon collection, battle, and arcade game built with React and Supabase. Collect cards, level them up to 20 stars, battle CPU or friends, complete drafts, earn badges and trophies, and track your stats.

Repository: https://github.com/TANISHQ1204/pokedex

## Features

- Supabase authentication with Google OAuth and email magic links.
- Username onboarding and player profiles.
- 20-star card progression with shiny cards at max level.
- Duplicate-based leveling and move unlocks as cards gain stars.
- Collection browser with search, filters, pagination, and alternate forms.
- Solo CPU battles with type matchups, PP, status effects, abilities, and held items.
- Friend challenges and realtime battle lobbies.
- Game modes: Mystery Draft, Deal or No Deal, and Dex Battle.
- Daily arcade rotation with Link Lab, Type Weaver, Catch Rush, and Memory Dex.
- Arcade rewards that grant 1-3 cards per run.
- Expanded badge case covering regional dexes, gyms, Elite Four, champions, villain teams, Battle Frontier, contests, type mastery, legendaries, and trainer milestones.
- Lore trophy hall spanning starters, fossils, pseudo-legendaries, Eeveelutions, babies, regional forms, Mega Evolutions, Gigantamax forms, Ultra Beasts, and Paradox Pokemon.
- Badge and trophy search, category filters, pagination, themed emblem designs, and completion tracking.
- Battle history, recent pulls, win rates, and activity statistics.
- Responsive layouts, keyboard controls, focus management, reduced-motion support, and a skip link.
- Special Power and Ancient card data remains available behind the hidden `/special-collection` route.

## Tech Stack

- React 18
- Vite 6
- React Router 6
- Supabase (`@supabase/supabase-js`)
- Plain CSS in `src/index.css`
- Standalone Node.js test and migration scripts

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project for authentication and persistence

### Install

```bash
git clone https://github.com/TANISHQ1204/pokedex.git
cd pokedex
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only the anon key belongs in the browser build. Never expose a Supabase service-role key through a `VITE_*` variable.

Without Supabase configuration, the app still opens in preview mode, but authentication, saved collections, Friends, and live stats are unavailable.

### Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite.

## Supabase Setup

The app expects the base tables `profiles`, `collections`, `friendships`, and `matches` to exist in the Supabase project. This repository does not bootstrap those base tables; use the existing project schema and its row-level security policies.

After that, apply these migrations in the Supabase Dashboard SQL Editor:

1. `scripts/migrate_star_levels_20.sql`

   One-time migration from the legacy star system to the 20-star system. It is safe to re-run, preserves progress, and leaves Power/Ancient cards untouched.

2. `scripts/create_analytics_tables.sql`

   Creates `battle_history` and `card_pulls`, their indexes, and owner-scoped row-level security policies. These tables begin recording activity after creation; historical battles cannot be rebuilt.

For authentication, enable the Google provider and/or email magic links in Supabase, and allow your local and production URLs as redirect targets.

The older `scripts/migrate_star_levels.sql` and `scripts/migrate_star_levels_10.js` files are obsolete. Do not run them against the current 20-star schema.

### Migration Audit

The 20-star migration has a read-only audit mode:

```bash
node scripts/migrate_star_levels_20.js
```

To apply fixes from the command line:

```bash
node scripts/migrate_star_levels_20.js --migrate
```

Command-line writes with the anon key are limited by row-level security and may only update the signed-in user. For a project-wide migration, use the SQL file in the Supabase SQL Editor.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `node scripts/migrate_star_levels_20.js` | Audit legacy star data (read-only) |
| `node scripts/migrate_star_levels_20.js --migrate` | Apply 20-star fixes |
| `node scripts/test_star_evolution.js` | Run star progression tests |
| `node scripts/test_arcade_core.js` | Run arcade scoring and reward tests |
| `node scripts/test_tcg_theme.js` | Run theme and visual-contract tests |
| `node scripts/testTrophies.js` | Run trophy tier and collection progress tests |
| `node scripts/testBadges.js` | Run badge unlock and mastery tests |
| `node scripts/testLoreAwards.js` | Run lore trophy/badge data and milestone tests |
| `node scripts/generateLoreAwards.js` | Regenerate lore collections and badges from base data |

Tests are standalone Node scripts rather than an npm test runner. Run individual files directly with `node`. The legacy `scripts/test_card_independence.js` suite is intentionally excluded because Power/Ancient drops are no longer part of the normal battle drop pool.

## Project Structure

```text
src/
  components/   Shared UI, cards, battle views, modals, navigation
  context/      Supabase authentication context
  data/         Pokemon, base/lore badges and trophies, learnsets, species, and evolution data
  game/         Battle, card, arcade, trophy, and progression logic
  hooks/        Reusable interaction and timing hooks
  pages/        Route-level screens
  store/        Supabase queries, collection state, stats, and matches
  utils/        Formatting, stats helpers, and shared data access
scripts/        Migrations, data generators, and standalone tests
```

Main routes include `/home`, `/arcade`, `/battle`, `/game-modes`, `/collection`, `/trophies`, `/badges`, `/stats`, `/friends`, `/account`, and `/match/:matchId`.

## Production Build

```bash
npm run build
```

Deploy the generated `dist/` directory to any static host. The app uses client-side routing, so configure the host to rewrite unknown paths to `index.html`.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment before building. Vite embeds these values at build time.

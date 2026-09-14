import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates src/data/learnsets.json — an ordered learnset per Pokemon.
 *
 * ORDERING = UNLOCK ORDER. The first 4 moves are the current battle moveset
 * (baseline, unchanged so star-1 cards behave exactly as before). Every
 * subsequent move unlocks one per star increase (star 2 → 5th move, ...,
 * star 10 → 13th move, capped by learnset length).
 *
 * Sources:
 *  - Baseline 4: existing moves in src/data/pokemon.json (preserved).
 *  - Additional: the species' cached PokeAPI /pokemon/{id} move list, preferring
 *    level-up moves (sort: earliest level first, then power asc for flavor).
 *  - Move metadata: known pool from pokemon.json → scripts/.cache/moves →
 *    live PokeAPI fetch → generic fallback object.
 *
 * Run: node scripts/generateLearnsets.js
 */

const MAX_LEARNSET = 13; // 4 baseline + up to 9 unlockable
const CACHE_DIR = path.join(__dirname, '.cache');
const POKEMON_CACHE = path.join(CACHE_DIR, 'pokemon');
const MOVE_CACHE = path.join(CACHE_DIR, 'moves');
const OUTPUT_PATH = path.join(__dirname, '../src/data/learnsets.json');

const HEALING_MOVES = new Set([
  'recover', 'synthesis', 'soft-boiled', 'roost', 'moonlight', 'slack-off',
  'milk-drink', 'wish', 'rest', 'heal-order', 'shore-up', 'morning-sun',
  'swallow', 'life-dew', 'jungle-healing',
]);

const STAT_BUFF_MOVES = {
  'swords-dance': { stat: 'attack', multiplier: 1.2 },
  'dragon-dance': { stat: 'attack', multiplier: 1.2 },
  'nasty-plot': { stat: 'specialAttack', multiplier: 1.2 },
  'calm-mind': { stat: 'specialAttack', multiplier: 1.2 },
  'agility': { stat: 'speed', multiplier: 1.2 },
  'iron-defense': { stat: 'defense', multiplier: 1.2 },
  'growth': { stat: 'attack', multiplier: 1.2 },
  'quiver-dance': { stat: 'specialAttack', multiplier: 1.2 },
  'bulk-up': { stat: 'attack', multiplier: 1.2 },
  'shell-smash': { stat: 'attack', multiplier: 1.2 },
  'amnesia': { stat: 'specialDefense', multiplier: 1.2 },
};

function formatTitle(str) {
  if (!str) return '';
  return str.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const pokeWiki = new Map();

// --- 1. Build the "known pool" from existing pokemon.json moves ------------
function loadKnownPool() {
  const src = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/pokemon.json'), 'utf-8'));
  const pool = new Map(); // normalized id -> move object
  const baseline = new Map(); // pokemon id -> moves array
  src.forEach((p) => {
    baseline.set(p.id, (p.moves || []).map((m) => ({ ...m })));
    (p.moves || []).forEach((m) => {
      const key = String(m.id).toLowerCase();
      if (!pool.has(key)) pool.set(key, { ...m });
    });
  });
  return { pool, baseline, src };
}

// --- 2. Resolve move metadata (cached → network → fallback) -----------------
function reshapeMove(raw, name) {
  const category = raw.damage_class?.name || 'physical';
  const safeId = name.replace(/-/g, '_');
  let effectText = 'A standard Pokémon attack.';
  if (raw.flavor_text_entries && raw.flavor_text_entries.length > 0) {
    const en = raw.flavor_text_entries.find((e) => e.language.name === 'en');
    if (en && en.flavor_text) effectText = en.flavor_text.replace(/[\n\f\r]/g, ' ');
  }
  const move = {
    id: safeId,
    name: formatTitle(name),
    type: raw.type?.name || 'normal',
    power: raw.power || 0,
    category,
    pp: raw.pp || 10,
    maxPp: raw.pp || 10,
    effect: effectText,
  };
  if (category === 'status') {
    if (HEALING_MOVES.has(name)) {
      move.healPercent = 0.25;
      move.effect = `Restores 25% of max HP. ${effectText}`;
    } else if (STAT_BUFF_MOVES[name]) {
      move.statBuff = STAT_BUFF_MOVES[name];
    }
  }
  return move;
}

function fallbackMove(name) {
  return {
    id: name.replace(/-/g, '_'),
    name: formatTitle(name),
    type: 'normal',
    power: 40,
    category: 'physical',
    pp: 35,
    maxPp: 35,
    effect: 'A standard physical attack.',
  };
}

async function fetchMoveWithCache(name) {
  // Known pool has the best metadata already.
  const pid = String(name.replace(/-/g, '_')).toLowerCase();
  if (pokeWiki.has(pid)) return pokeWiki.get(pid);
  if (pokeWiki.has(name)) return pokeWiki.get(name);

  const cachePath = path.join(MOVE_CACHE, `${name}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      return reshapeMove(raw, name);
    } catch (_) { /* refetch */ }
  }
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${name}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    fs.writeFileSync(cachePath, JSON.stringify(raw), 'utf-8');
    return reshapeMove(raw, name);
  } catch (err) {
    return fallbackMove(name);
  }
}

// --- 3. Compute one species' ordered learnset --------------------------------
async function computeLearnset(pokeId, pokeData, baseline) {
  // Baseline: existing 4 moves for this species (preserve battle behavior).
  const baseNames = (baseline.get(pokeId) || []).map((m) => m.id);

  // Gather candidate moves from the cached species.
  const candidates = new Map(); // moveName -> { minLevel, isLevelUp }
  (pokeData.moves || []).forEach((m) => {
    const mv = m.move.name;
    if (!candidates.has(mv)) candidates.set(mv, { minLevel: Infinity, isLevelUp: false });
    (m.version_group_details || []).forEach((vgd) => {
      if (vgd.move_learn_method.name === 'level-up') {
        candidates.get(mv).isLevelUp = true;
        if (vgd.level_learned_at < candidates.get(mv).minLevel) {
          candidates.get(mv).minLevel = vgd.level_learned_at;
        }
      }
    });
  });

  // Order base moves exactly as the existing moveset; extras from candidates.
  const selected = [...baseNames];
  const sorted = [...candidates.entries()]
    .filter(([name]) => !baseNames.includes(name.replace(/-/g, '_')))
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => {
      const la = a.isLevelUp ? a.minLevel : 100000;
      const lb = b.isLevelUp ? b.minLevel : 100000;
      if (la !== lb) return la - lb;
      return a.name.localeCompare(b.name);
    });

  const need = MAX_LEARNSET - selected.length;
  const extras = [];
  for (let i = 0; i < Math.min(need, sorted.length); i++) {
    const cand = sorted[i];
    const move = await fetchMoveWithCache(cand.name);
    const id = move.id;
    if (!selected.includes(id)) {
      selected.push(id);
      extras.push(move);
    }
  }

  // Final learnset in unlock order: baseline (choice) then extras (ordered).
  const baseMoves = (baseline.get(pokeId) || []).map((m) => ({ ...m }));
  return [...baseMoves, ...extras];
}

// --- 4. Main -----------------------------------------------------------------
async function main() {
  const { pool, baseline, src } = loadKnownPool();
  for (const [k, v] of pool.entries()) pokeWiki.set(k, v);

  const out = {};
  let done = 0;

  for (const id of src.map((p) => p.id)) {
    const f = path.join(POKEMON_CACHE, `${id}.json`);
    if (!fs.existsSync(f)) continue;
    let pokeData;
    try {
      pokeData = JSON.parse(fs.readFileSync(f, 'utf-8'));
    } catch (_) {
      continue;
    }
    const learnset = await computeLearnset(id, pokeData, baseline);
    out[id] = learnset;
    done += 1;
    if (done % 200 === 0) console.log(`Processed ${done} species...`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf-8');
  const with13 = Object.values(out).filter((l) => l.length >= 13).length;
  console.log(`Wrote ${OUTPUT_PATH}: ${Object.keys(out).length} species, ${with13} with full 13-move learnsets.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
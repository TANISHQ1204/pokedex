import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOTAL_POKEMON = 1025; // Gen 1 to Gen 9 (Pecharunt is #1025)
const HP_MULTIPLIER = 1.20; // 20% multiplier applied to base HP
const CONCURRENCY_LIMIT = 10;
const BATCH_DELAY_MS = 50;

const CACHE_DIR = path.join(__dirname, '.cache');
const POKEMON_CACHE = path.join(CACHE_DIR, 'pokemon');
const SPECIES_CACHE = path.join(CACHE_DIR, 'species');
const CHAIN_CACHE = path.join(CACHE_DIR, 'chains');
const MOVE_CACHE = path.join(CACHE_DIR, 'moves');

// Ensure cache directories exist
[CACHE_DIR, POKEMON_CACHE, SPECIES_CACHE, CHAIN_CACHE, MOVE_CACHE].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Fetch with disk caching and exponential backoff retries.
 */
async function fetchWithCache(url, cachePath, retries = 5, delay = 500) {
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      // Invalid cache file, re-fetch
    }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = delay * Math.pow(2, attempt);
        console.warn(`[429 Rate Limit] Retrying ${url} in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
      return data;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      const wait = delay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

/**
 * Capitalizes and formats raw hyphenated strings into proper titles.
 */
function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Traverses evolution chain tree to check if speciesName is at final evolution.
 */
function isFinalInChain(chainNode, speciesName) {
  if (!chainNode || !chainNode.species) return null;
  if (chainNode.species.name === speciesName) {
    return chainNode.evolves_to.length === 0;
  }
  for (const child of chainNode.evolves_to) {
    const res = isFinalInChain(child, speciesName);
    if (res !== null) return res;
  }
  return null;
}

/**
 * Common healing status moves list for healPercent formatting.
 */
const HEALING_MOVES = new Set([
  'recover',
  'synthesis',
  'soft-boiled',
  'roost',
  'moonlight',
  'slack-off',
  'milk-drink',
  'wish',
  'rest',
  'heal-order',
  'shore-up',
  'morning-sun',
  'swallow',
  'life-dew',
  'jungle-healing',
]);

/**
 * Stat buff status moves mapping.
 */
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

/**
 * Fetch and process details for a move.
 */
async function fetchMoveDetails(moveName) {
  const safeName = moveName.toLowerCase();
  const cachePath = path.join(MOVE_CACHE, `${safeName}.json`);
  const moveUrl = `https://pokeapi.co/api/v2/move/${safeName}`;

  try {
    const raw = await fetchWithCache(moveUrl, cachePath);
    const category = raw.damage_class?.name || 'physical';
    const moveId = safeName.replace(/-/g, '_');
    const name = formatTitle(safeName);

    let effectText = 'A standard Pokémon attack.';
    if (raw.flavor_text_entries && raw.flavor_text_entries.length > 0) {
      const enEntry = raw.flavor_text_entries.find((e) => e.language.name === 'en');
      if (enEntry && enEntry.flavor_text) {
        effectText = enEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
      }
    }

    const moveObj = {
      id: moveId,
      name: name,
      type: raw.type?.name || 'normal',
      power: raw.power || 0,
      category: category,
      pp: raw.pp || 10,
      maxPp: raw.pp || 10,
      effect: effectText,
    };

    if (category === 'status') {
      if (HEALING_MOVES.has(safeName)) {
        moveObj.healPercent = 0.25;
        moveObj.effect = `Restores 25% of max HP. ${effectText}`;
      } else if (STAT_BUFF_MOVES[safeName]) {
        moveObj.statBuff = STAT_BUFF_MOVES[safeName];
      }
    }

    return moveObj;
  } catch (err) {
    console.warn(`Failed to fetch move details for ${moveName}:`, err.message);
    return {
      id: moveName.replace(/-/g, '_'),
      name: formatTitle(moveName),
      type: 'normal',
      power: 40,
      category: 'physical',
      pp: 35,
      maxPp: 35,
      effect: 'A standard physical attack.',
    };
  }
}

/**
 * Process a single Pokemon by ID.
 */
async function processPokemon(id) {
  const pokeCache = path.join(POKEMON_CACHE, `${id}.json`);
  const pokeData = await fetchWithCache(`https://pokeapi.co/api/v2/pokemon/${id}`, pokeCache);

  const speciesCache = path.join(SPECIES_CACHE, `${id}.json`);
  const speciesData = await fetchWithCache(`https://pokeapi.co/api/v2/pokemon-species/${id}`, speciesCache);

  // Determine isFinalEvolution
  let isFinal = true;
  if (speciesData.evolution_chain?.url) {
    const chainUrl = speciesData.evolution_chain.url;
    const chainMatch = chainUrl.match(/\/evolution-chain\/(\d+)\//);
    if (chainMatch) {
      const chainId = chainMatch[1];
      const chainCache = path.join(CHAIN_CACHE, `${chainId}.json`);
      const chainData = await fetchWithCache(chainUrl, chainCache);
      const computed = isFinalInChain(chainData.chain, speciesData.name);
      if (computed !== null) {
        isFinal = computed;
      }
    }
  }

  // Extract base stats
  const baseStats = {};
  pokeData.stats.forEach((s) => {
    baseStats[s.stat.name] = s.base_stat;
  });

  const hp = Math.round((baseStats['hp'] || 0) * HP_MULTIPLIER);
  const attack = baseStats['attack'] || 0;
  const defense = baseStats['defense'] || 0;
  const specialAttack = baseStats['special-attack'] || 0;
  const specialDefense = baseStats['special-defense'] || 0;
  const speed = baseStats['speed'] || 0;

  // Extract types
  const types = pokeData.types.map((t) => t.type.name);

  // Extract sprites
  const normalSprite =
    pokeData.sprites.front_default ||
    pokeData.sprites.other?.['official-artwork']?.front_default ||
    '';
  const shinySprite =
    pokeData.sprites.front_shiny ||
    pokeData.sprites.other?.['official-artwork']?.front_shiny ||
    '';

  // Pick 4 level-up moves
  const levelUpMoves = [];
  const otherMoves = [];

  pokeData.moves.forEach((m) => {
    let maxLevel = -1;
    let isLevelUp = false;

    m.version_group_details.forEach((vgd) => {
      if (vgd.move_learn_method.name === 'level-up') {
        isLevelUp = true;
        if (vgd.level_learned_at > maxLevel) {
          maxLevel = vgd.level_learned_at;
        }
      }
    });

    if (isLevelUp) {
      levelUpMoves.push({ moveName: m.move.name, level: maxLevel });
    } else {
      otherMoves.push({ moveName: m.move.name, level: 0 });
    }
  });

  // Sort level up moves by level descending
  levelUpMoves.sort((a, b) => b.level - a.level);

  let selectedMoveNames = levelUpMoves.slice(0, 4).map((m) => m.moveName);

  if (selectedMoveNames.length < 4) {
    for (const m of otherMoves) {
      if (!selectedMoveNames.includes(m.moveName)) {
        selectedMoveNames.push(m.moveName);
      }
      if (selectedMoveNames.length === 4) break;
    }
  }

  // Fallback if still under 4 moves (e.g. Ditto/Unown)
  const defaultFallbacks = ['tackle', 'scratch', 'pound', 'struggle'];
  for (const fb of defaultFallbacks) {
    if (selectedMoveNames.length >= 4) break;
    if (!selectedMoveNames.includes(fb)) {
      selectedMoveNames.push(fb);
    }
  }

  // Fetch moves details concurrently for this Pokemon
  const moves = await Promise.all(selectedMoveNames.map((name) => fetchMoveDetails(name)));

  return {
    id: pokeData.id,
    name: pokeData.name,
    types: types,
    stats: {
      hp,
      attack,
      defense,
      specialAttack,
      specialDefense,
      speed,
    },
    sprites: {
      normal: normalSprite,
      shiny: shinySprite,
    },
    isFinalEvolution: isFinal,
    moves: moves,
  };
}

/**
 * Main execution function.
 */
async function main() {
  console.log(`Starting National Dex fetch for Pokemon #1 to #${TOTAL_POKEMON}...`);
  const results = [];
  const startTime = Date.now();

  for (let i = 1; i <= TOTAL_POKEMON; i += CONCURRENCY_LIMIT) {
    const batchIds = [];
    for (let j = i; j < i + CONCURRENCY_LIMIT && j <= TOTAL_POKEMON; j++) {
      batchIds.push(j);
    }

    const batchResults = await Promise.all(
      batchIds.map((id) =>
        processPokemon(id).catch((err) => {
          console.error(`Error processing Pokemon #${id}:`, err.message);
          return null;
        })
      )
    );

    batchResults.forEach((res) => {
      if (res) results.push(res);
    });

    const percent = Math.round((results.length / TOTAL_POKEMON) * 100);
    console.log(`[Progress: ${results.length}/${TOTAL_POKEMON} (${percent}%)] Fetched up to ID ${batchIds[batchIds.length - 1]}`);

    if (BATCH_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Sort results by ID
  results.sort((a, b) => a.id - b.id);

  const outputDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'pokemon.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Successfully generated National Dex data (${results.length} Pokémon) in ${elapsed}s!`);
  console.log(`Saved to ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error in fetch script:', err);
  process.exit(1);
});

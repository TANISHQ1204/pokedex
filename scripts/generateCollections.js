import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokemonPath = path.join(__dirname, '../src/data/pokemon.json');
const speciesDir = path.join(__dirname, '.cache/species');
const outputPath = path.join(__dirname, '../src/data/collections.json');

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function main() {
  console.log('Generating collections dataset from pokemon.json & species cache...');

  const pokemonList = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const pokemonMap = new Map();
  pokemonList.forEach((p) => pokemonMap.set(p.id, p));

  const collections = [];

  // 1. TYPE COLLECTIONS (18 types)
  const POKEMON_TYPES = [
    'normal',
    'fire',
    'water',
    'grass',
    'electric',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
    'dark',
    'steel',
    'fairy',
  ];

  POKEMON_TYPES.forEach((t) => {
    const ids = pokemonList.filter((p) => p.types.includes(t)).map((p) => p.id);
    collections.push({
      id: `type_${t}`,
      name: `${formatTitle(t)} Masters`,
      category: 'type',
      pokemonIds: ids,
    });
  });

  // 2. RARITY & BST BAND COLLECTIONS
  const legendariesAndMythicals = [];
  const highBst = [];
  const midBst = [];
  const lowBst = [];

  pokemonList.forEach((p) => {
    const speciesFile = path.join(speciesDir, `${p.id}.json`);
    let isLegendaryOrMythical = false;

    if (fs.existsSync(speciesFile)) {
      try {
        const spec = JSON.parse(fs.readFileSync(speciesFile, 'utf-8'));
        if (spec.is_legendary || spec.is_mythical) {
          isLegendaryOrMythical = true;
        }
      } catch (e) {
        // ignore error
      }
    }

    const bst =
      p.stats.hp +
      p.stats.attack +
      p.stats.defense +
      p.stats.specialAttack +
      p.stats.specialDefense +
      p.stats.speed;

    if (isLegendaryOrMythical) {
      legendariesAndMythicals.push(p.id);
    } else if (bst >= 530) {
      highBst.push(p.id);
    } else if (bst >= 420) {
      midBst.push(p.id);
    } else {
      lowBst.push(p.id);
    }
  });

  collections.push({
    id: 'rarity_legendary_mythical',
    name: 'Legendary & Mythical Titans',
    category: 'rarity',
    pokemonIds: legendariesAndMythicals,
  });

  collections.push({
    id: 'rarity_high_bst',
    name: 'Elite Powerhouses (BST 530+)',
    category: 'rarity',
    pokemonIds: highBst,
  });

  collections.push({
    id: 'rarity_mid_bst',
    name: 'Mid-Tier Battlers (BST 420-529)',
    category: 'rarity',
    pokemonIds: midBst,
  });

  collections.push({
    id: 'rarity_low_bst',
    name: 'Little Cup & Starter Tier (BST < 420)',
    category: 'rarity',
    pokemonIds: lowBst,
  });

  // 3. EVOLUTION FAMILY COLLECTIONS
  const familyMap = new Map(); // chainId -> array of pokemon ids

  pokemonList.forEach((p) => {
    const speciesFile = path.join(speciesDir, `${p.id}.json`);
    let chainId = `single_${p.id}`;

    if (fs.existsSync(speciesFile)) {
      try {
        const spec = JSON.parse(fs.readFileSync(speciesFile, 'utf-8'));
        if (spec.evolution_chain?.url) {
          const match = spec.evolution_chain.url.match(/\/evolution-chain\/(\d+)\//);
          if (match) {
            chainId = match[1];
          }
        }
      } catch (e) {
        // fallback
      }
    }

    if (!familyMap.has(chainId)) {
      familyMap.set(chainId, []);
    }
    familyMap.get(chainId).push(p.id);
  });

  familyMap.forEach((ids, chainId) => {
    ids.sort((a, b) => a - b);
    const rootPokemon = pokemonMap.get(ids[0]);
    const rootName = rootPokemon ? formatTitle(rootPokemon.name) : `Family #${chainId}`;
    collections.push({
      id: `family_${chainId}`,
      name: `${rootName} Line`,
      category: 'family',
      pokemonIds: ids,
    });
  });

  fs.writeFileSync(outputPath, JSON.stringify(collections, null, 2), 'utf-8');
  console.log(`Successfully generated ${collections.length} collections and saved to ${outputPath}`);
}

main();

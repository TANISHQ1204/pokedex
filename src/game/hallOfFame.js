import { MAX_STAR_LEVEL } from './cardLevels.js';
import { allCollections, getCollectionCategoryMeta } from '../data/awards.js';
import { fullPokemonList, displayName, isAltForm } from '../utils/pokemonCatalog.js';
import speciesMeta from '../data/speciesMeta.json' with { type: 'json' };

const GENERATION_REGIONS = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Unova',
  6: 'Kalos',
  7: 'Alola',
  8: 'Galar',
  9: 'Paldea',
};

const DEX_GENERATION_RANGES = [
  [1, 151, 1],
  [152, 251, 2],
  [252, 386, 3],
  [387, 493, 4],
  [494, 649, 5],
  [650, 721, 6],
  [722, 809, 7],
  [810, 905, 8],
  [906, 1025, 9],
];

const TYPE_EPITHETS = {
  normal: ['Grand', 'Steadfast', 'Unyielding'],
  fire: ['Ember', 'Blazing', 'Cinder'],
  water: ['Tidal', 'Abyssal', 'Torrential'],
  electric: ['Storm', 'Charged', 'Thunder'],
  grass: ['Verdant', 'Bloom', 'Thorn'],
  ice: ['Frost', 'Glacial', 'Rime'],
  fighting: ['Iron', 'Valiant', 'Stalwart'],
  poison: ['Venom', 'Toxic', 'Blight'],
  ground: ['Earth', 'Terracotta', 'Dust'],
  flying: ['Sky', 'Gale', 'Tempest'],
  psychic: ['Astral', 'Mind', 'Oracle'],
  bug: ['Swarm', 'Hive', 'Silken'],
  rock: ['Stone', 'Bedrock', 'Ancient'],
  ghost: ['Phantom', 'Spectral', 'Hollow'],
  dragon: ['Draconic', 'Wyrm', 'Sovereign'],
  dark: ['Umbra', 'Midnight', 'Shadow'],
  steel: ['Steel', 'Alloy', 'Tempered'],
  fairy: ['Fae', 'Radiant', 'Enchanted'],
};

const TYPE_ACCENTS = {
  normal: '#94a3b8',
  fire: '#f97316',
  water: '#38bdf8',
  electric: '#facc15',
  grass: '#4ade80',
  ice: '#67e8f9',
  fighting: '#ef4444',
  poison: '#a855f7',
  ground: '#d97706',
  flying: '#7dd3fc',
  psychic: '#f472b6',
  bug: '#a3e635',
  rock: '#c2a26b',
  ghost: '#818cf8',
  dragon: '#6366f1',
  dark: '#64748b',
  steel: '#cbd5e1',
  fairy: '#f9a8d4',
};

const HONOR_NOUNS = {
  mythical: 'Myth',
  legendary: 'Sovereign',
  champion: 'Champion',
  elite: 'Elite',
  gym: 'Ace',
  villain: 'Renegade',
  frontier: 'Frontier',
  contest: 'Idol',
  pseudo: 'Apex',
  starter: 'Trailblazer',
  fossil: 'Relic',
  mascot: 'Icon',
  ultrabeast: 'Anomaly',
  paradox: 'Paradox',
  mega: 'Ascendant',
  gmax: 'Titan',
  regional: 'Wanderer',
  eevee: 'Evolution',
  baby: 'Beginning',
  type: 'Master',
  rarity: 'Rarity',
  family: 'Heir',
};

const CATEGORY_PRIORITY = [
  'mythical',
  'legendary',
  'champion',
  'elite',
  'gym',
  'villain',
  'frontier',
  'contest',
  'pseudo',
  'starter',
  'fossil',
  'mascot',
  'ultrabeast',
  'paradox',
  'mega',
  'gmax',
  'regional',
  'eevee',
  'baby',
  'type',
  'rarity',
  'family',
];

function normalizeCollection(collection) {
  if (!collection) return new Map();

  const map = new Map();
  if (collection instanceof Map) {
    collection.forEach((entry, key) => {
      if (!entry) return;
      const id = Number(entry.pokemon_id ?? key);
      if (Number.isFinite(id)) map.set(id, entry);
    });
    return map;
  }

  if (Array.isArray(collection)) {
    collection.forEach((entry) => {
      if (!entry || entry.pokemon_id == null) return;
      const id = Number(entry.pokemon_id);
      if (Number.isFinite(id) && !map.has(id)) map.set(id, entry);
    });
  }
  return map;
}

function timeValue(entry) {
  const raw = entry?.updated_at || entry?.created_at;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function hashId(id, salt = 0) {
  const value = Math.abs(Math.floor(Number(id) || 0)) + salt * 7919;
  return value % 997;
}

function generationForPokemon(pokemon, meta) {
  if (pokemon?.generation) return Number(pokemon.generation);
  if (meta?.gen) return Number(meta.gen);

  const dexNo = Number(pokemon?.dexNo || pokemon?.id || 0);
  const range = DEX_GENERATION_RANGES.find(([min, max]) => dexNo >= min && dexNo <= max);
  return range ? range[2] : 1;
}

function categoryRank(category) {
  const index = CATEGORY_PRIORITY.indexOf(category);
  return index === -1 ? CATEGORY_PRIORITY.length : index;
}

export function isHallInductee(entry) {
  if (!entry) return false;
  return Number(entry.star_level) >= MAX_STAR_LEVEL;
}

export function buildHonorsIndex(collections = allCollections) {
  const index = new Map();

  collections.forEach((collection) => {
    if (!collection || !Array.isArray(collection.pokemonIds)) return;
    const categoryMeta = getCollectionCategoryMeta(collection.category);
    const honor = {
      id: collection.id,
      name: collection.name,
      category: collection.category || 'family',
      categoryLabel: categoryMeta.label,
      accent: categoryMeta.accent,
      design: categoryMeta.design,
    };

    collection.pokemonIds.forEach((pokemonId) => {
      const id = Number(pokemonId);
      if (!Number.isFinite(id)) return;
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(honor);
    });
  });

  index.forEach((honors) => {
    honors.sort((a, b) => (
      categoryRank(a.category) - categoryRank(b.category) ||
      a.name.localeCompare(b.name)
    ));
  });

  return index;
}

export function getSpeciesIdentity(pokemon) {
  const meta = speciesMeta[String(pokemon?.id)] || {};
  const generation = generationForPokemon(pokemon, meta);

  return {
    generation,
    region: GENERATION_REGIONS[generation] || 'Unknown',
    genus: pokemon?.genus || meta.genus || 'Pokemon',
    color: pokemon?.color || meta.color || 'gray',
    rarer: Boolean(pokemon?.rarer ?? meta.rarer),
  };
}

export function getInducteeEpithet(pokemon, honors = []) {
  const primaryType = pokemon?.types?.[0] || 'normal';
  const words = TYPE_EPITHETS[primaryType] || TYPE_EPITHETS.normal;
  const word = words[hashId(pokemon?.id, 3) % words.length];
  const topHonor = honors.find((honor) => HONOR_NOUNS[honor.category]);
  const noun = HONOR_NOUNS[topHonor?.category] || 'Hall Star';
  return `The ${word} ${noun}`;
}

export function buildHallInductee(pokemon, entry, honors = [], inductionNumber = null) {
  if (!pokemon || !isHallInductee(entry)) return null;

  const identity = getSpeciesIdentity(pokemon);
  const primaryType = pokemon.types?.[0] || 'normal';
  const sortedHonors = [...honors].sort((a, b) => (
    categoryRank(a.category) - categoryRank(b.category) ||
    a.name.localeCompare(b.name)
  ));

  return {
    id: Number(pokemon.id),
    pokemon,
    entry,
    name: displayName(pokemon),
    dexNo: Number(pokemon.dexNo || pokemon.id),
    isForm: isAltForm(pokemon),
    types: pokemon.types || [],
    primaryType,
    accent: TYPE_ACCENTS[primaryType] || TYPE_ACCENTS.normal,
    ...identity,
    epithet: getInducteeEpithet(pokemon, sortedHonors),
    honors: sortedHonors,
    topHonors: sortedHonors.slice(0, 3),
    inductedAt: entry.updated_at || entry.created_at || null,
    inductionNumber,
  };
}

export function buildHallOfFame({
  collection,
  catalog = fullPokemonList,
  collections = allCollections,
} = {}) {
  const collectionMap = normalizeCollection(collection);
  const catalogById = new Map((catalog || []).map((pokemon) => [Number(pokemon.id), pokemon]));
  const honorsIndex = buildHonorsIndex(collections);

  const inducted = [];
  collectionMap.forEach((entry, id) => {
    if (!isHallInductee(entry)) return;
    const pokemon = catalogById.get(id);
    if (pokemon) inducted.push({ pokemon, entry, id });
  });

  inducted.sort((a, b) => (
    timeValue(a.entry) - timeValue(b.entry) ||
    a.id - b.id
  ));

  const inductionOrder = inducted.map(({ pokemon, entry, id }, index) => {
    const directHonors = honorsIndex.get(id) || [];
    const speciesHonors = honorsIndex.get(Number(pokemon.dexNo)) || [];
    const honors = directHonors.length > 0 ? directHonors : speciesHonors;
    return buildHallInductee(pokemon, entry, honors, index + 1);
  });

  const inductees = [...inductionOrder].sort((a, b) => (
    timeValue(b.entry) - timeValue(a.entry) ||
    b.inductionNumber - a.inductionNumber
  ));

  const catalogCount = catalogById.size;

  return {
    inductees,
    inductionOrder,
    inductedCount: inductees.length,
    catalogCount,
    completionPercent: catalogCount
      ? Math.round((inductees.length / catalogCount) * 100)
      : 0,
    newest: inductees[0] || null,
  };
}

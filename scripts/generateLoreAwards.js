import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../src/data');
const pokemon = JSON.parse(fs.readFileSync(path.join(dataDir, 'pokemon.json'), 'utf-8'));
const speciesMeta = JSON.parse(fs.readFileSync(path.join(dataDir, 'speciesMeta.json'), 'utf-8'));
const evolutionPaths = JSON.parse(fs.readFileSync(path.join(dataDir, 'evolutionPaths.json'), 'utf-8'));
const forms = JSON.parse(fs.readFileSync(path.join(dataDir, 'forms.json'), 'utf-8'));

const byId = new Map(pokemon.map((p) => [Number(p.id), p]));
const validIds = new Set(pokemon.map((p) => Number(p.id)));

function bst(p) {
  return Object.values(p.stats || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function uniq(ids) {
  return [...new Set(ids.map(Number).filter((id) => validIds.has(id)))];
}

const pathByMember = new Map();
evolutionPaths.forEach((family) => {
  family.forEach((id) => pathByMember.set(Number(id), family.map(Number)));
});

function familyIds(firstId) {
  return uniq(pathByMember.get(Number(firstId)) || [Number(firstId)]);
}

function families(ids) {
  return uniq(ids.flatMap((id) => familyIds(id)));
}

const TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

const TYPE_THEME = {
  normal: { design: 'star', accent: '#c7c7a8' },
  fire: { design: 'flame', accent: '#f97316' },
  water: { design: 'droplet', accent: '#38bdf8' },
  grass: { design: 'leaf', accent: '#22c55e' },
  electric: { design: 'bolt', accent: '#facc15' },
  ice: { design: 'snow', accent: '#67e8f9' },
  fighting: { design: 'fist', accent: '#ef4444' },
  poison: { design: 'skull', accent: '#a855f7' },
  ground: { design: 'gear', accent: '#d6a86a' },
  flying: { design: 'wing', accent: '#93c5fd' },
  psychic: { design: 'eye', accent: '#f472b6' },
  bug: { design: 'hex', accent: '#84cc16' },
  rock: { design: 'gem', accent: '#a16207' },
  ghost: { design: 'moon', accent: '#818cf8' },
  dragon: { design: 'wing', accent: '#6366f1' },
  dark: { design: 'fang', accent: '#64748b' },
  steel: { design: 'gear', accent: '#94a3b8' },
  fairy: { design: 'star', accent: '#f9a8d4' },
};

const CATEGORY_THEME = {
  legendary: { design: 'crown', accent: '#fbbf24' },
  mythical: { design: 'prism', accent: '#f472b6' },
  starter: { design: 'pokeball', accent: '#ef4444' },
  fossil: { design: 'fossil', accent: '#c2a26b' },
  pseudo: { design: 'fang', accent: '#8b5cf6' },
  eevee: { design: 'star', accent: '#fbbf24' },
  baby: { design: 'heart', accent: '#f9a8d4' },
  ultrabeast: { design: 'eye', accent: '#a855f7' },
  paradox: { design: 'prism', accent: '#22d3ee' },
  regional: { design: 'compass', accent: '#34d399' },
  mega: { design: 'crystal', accent: '#22d3ee' },
  gmax: { design: 'gear', accent: '#ef4444' },
  gym: { design: 'shield', accent: '#f59e0b' },
  elite: { design: 'laurel', accent: '#a78bfa' },
  champion: { design: 'crown', accent: '#fbbf24' },
  villain: { design: 'skull', accent: '#dc2626' },
  frontier: { design: 'compass', accent: '#38bdf8' },
  contest: { design: 'ribbon', accent: '#ec4899' },
  mascot: { design: 'sun', accent: '#fbbf24' },
  type: { design: 'star', accent: '#38bdf8' },
  milestone: { design: 'medal', accent: '#fbbf24' },
  mastery: { design: 'crown', accent: '#f472b6' },
  regional_dex: { design: 'shield', accent: '#4ade80' },
};

const finalByType = new Map();
TYPES.forEach((type) => {
  finalByType.set(
    type,
    pokemon
      .filter((p) => p.types.includes(type) && p.isFinalEvolution)
      .sort((a, b) => bst(b) - bst(a))
      .map((p) => Number(p.id))
  );
});

function typedRoster(type, extra = [], count = 10) {
  return uniq([...extra, ...(finalByType.get(type) || [])]).slice(0, count);
}

const sets = [];

function addSet({
  key,
  name,
  category,
  region,
  description,
  pokemonIds,
  badgeName,
  badgeFamily,
  design,
  accent,
  makeBadge = true,
}) {
  const theme = CATEGORY_THEME[category] || { design: 'shield', accent: '#f59e0b' };
  sets.push({
    key,
    name,
    category,
    region: region || category,
    description,
    pokemonIds: uniq(pokemonIds),
    badgeName: badgeName || `${name} Badge`,
    badgeFamily: badgeFamily || category,
    design: design || theme.design,
    accent: accent || theme.accent,
    makeBadge,
  });
}

/* -------------------------------------------------------------------------- */
/* Gym leader sets                                                            */
/* -------------------------------------------------------------------------- */

const GYMS = [
  { key: 'kanto_boulder', badge: 'Boulder Badge', leader: 'Brock', region: 'Kanto', type: 'rock', ace: [74, 75, 76, 95], makeBadge: false },
  { key: 'kanto_cascade', badge: 'Cascade Badge', leader: 'Misty', region: 'Kanto', type: 'water', ace: [54, 55, 120, 121], makeBadge: false },
  { key: 'kanto_thunder', badge: 'Thunder Badge', leader: 'Lt. Surge', region: 'Kanto', type: 'electric', ace: [25, 26, 81, 82, 100, 101], makeBadge: false },
  { key: 'kanto_rainbow', badge: 'Rainbow Badge', leader: 'Erika', region: 'Kanto', type: 'grass', ace: [43, 44, 45, 69, 70, 71, 114], makeBadge: false },
  { key: 'kanto_soul', badge: 'Soul Badge', leader: 'Koga', region: 'Kanto', type: 'poison', ace: [23, 24, 41, 42, 88, 89, 109, 110], makeBadge: false },
  { key: 'kanto_marsh', badge: 'Marsh Badge', leader: 'Sabrina', region: 'Kanto', type: 'psychic', ace: [63, 64, 65, 96, 97, 122], makeBadge: false },
  { key: 'kanto_volcano', badge: 'Volcano Badge', leader: 'Blaine', region: 'Kanto', type: 'fire', ace: [37, 38, 58, 59, 77, 78, 126], makeBadge: false },
  { key: 'kanto_earth', badge: 'Earth Badge', leader: 'Giovanni', region: 'Kanto', type: 'ground', ace: [27, 28, 31, 34, 50, 51, 111, 112], makeBadge: false },

  { key: 'johto_zephyr', badge: 'Zephyr Badge', leader: 'Falkner', region: 'Johto', type: 'flying', ace: [16, 17, 18, 21, 22, 164] },
  { key: 'johto_hive', badge: 'Hive Badge', leader: 'Bugsy', region: 'Johto', type: 'bug', ace: [10, 11, 12, 123, 204, 205] },
  { key: 'johto_plain', badge: 'Plain Badge', leader: 'Whitney', region: 'Johto', type: 'normal', ace: [35, 36, 39, 40, 52, 53, 241] },
  { key: 'johto_fog', badge: 'Fog Badge', leader: 'Morty', region: 'Johto', type: 'ghost', ace: [92, 93, 94, 200, 201, 202] },
  { key: 'johto_storm', badge: 'Storm Badge', leader: 'Chuck', region: 'Johto', type: 'fighting', ace: [56, 57, 62, 66, 67, 68, 214] },
  { key: 'johto_mineral', badge: 'Mineral Badge', leader: 'Jasmine', region: 'Johto', type: 'steel', ace: [81, 82, 208, 212, 227] },
  { key: 'johto_glacier', badge: 'Glacier Badge', leader: 'Pryce', region: 'Johto', type: 'ice', ace: [86, 87, 124, 131, 220, 221, 225, 362] },
  { key: 'johto_rising', badge: 'Rising Badge', leader: 'Clair', region: 'Johto', type: 'dragon', ace: [147, 148, 149, 230, 333, 334] },

  { key: 'hoenn_stone', badge: 'Stone Badge', leader: 'Roxanne', region: 'Hoenn', type: 'rock', ace: [74, 75, 76, 299, 304, 305, 306] },
  { key: 'hoenn_knuckle', badge: 'Knuckle Badge', leader: 'Brawly', region: 'Hoenn', type: 'fighting', ace: [56, 57, 62, 66, 67, 68, 296, 297] },
  { key: 'hoenn_dynamo', badge: 'Dynamo Badge', leader: 'Wattson', region: 'Hoenn', type: 'electric', ace: [81, 82, 100, 101, 125, 239, 310] },
  { key: 'hoenn_heat', badge: 'Heat Badge', leader: 'Flannery', region: 'Hoenn', type: 'fire', ace: [37, 38, 58, 59, 77, 78, 126, 323] },
  { key: 'hoenn_balance', badge: 'Balance Badge', leader: 'Norman', region: 'Hoenn', type: 'normal', ace: [35, 36, 39, 40, 52, 53, 289, 293, 294, 295] },
  { key: 'hoenn_feather', badge: 'Feather Badge', leader: 'Winona', region: 'Hoenn', type: 'flying', ace: [16, 17, 18, 21, 22, 164, 277, 333, 334, 357] },
  { key: 'hoenn_mind', badge: 'Mind Badge', leader: 'Tate & Liza', region: 'Hoenn', type: 'psychic', ace: [63, 64, 65, 96, 97, 177, 178, 337, 338, 344] },
  { key: 'hoenn_rain', badge: 'Rain Badge', leader: 'Wallace', region: 'Hoenn', type: 'water', ace: [54, 55, 86, 87, 118, 119, 130, 131, 134, 350] },

  { key: 'sinnoh_coal', badge: 'Coal Badge', leader: 'Roark', region: 'Sinnoh', type: 'rock', ace: [74, 75, 76, 95, 246, 247, 248, 408, 409] },
  { key: 'sinnoh_forest', badge: 'Forest Badge', leader: 'Gardenia', region: 'Sinnoh', type: 'grass', ace: [43, 44, 45, 69, 70, 71, 114, 182, 406, 407] },
  { key: 'sinnoh_cobble', badge: 'Cobble Badge', leader: 'Maylene', region: 'Sinnoh', type: 'fighting', ace: [56, 57, 62, 66, 67, 68, 447, 448, 475] },
  { key: 'sinnoh_fen', badge: 'Fen Badge', leader: 'Crasher Wake', region: 'Sinnoh', type: 'water', ace: [54, 55, 86, 87, 118, 119, 130, 131, 134, 350] },
  { key: 'sinnoh_relic', badge: 'Relic Badge', leader: 'Fantina', region: 'Sinnoh', type: 'ghost', ace: [92, 93, 94, 200, 201, 202, 353, 354, 355, 356] },
  { key: 'sinnoh_mine', badge: 'Mine Badge', leader: 'Byron', region: 'Sinnoh', type: 'steel', ace: [81, 82, 208, 212, 227, 374, 375, 376, 410, 411] },
  { key: 'sinnoh_icicle', badge: 'Icicle Badge', leader: 'Candice', region: 'Sinnoh', type: 'ice', ace: [86, 87, 124, 131, 220, 221, 225, 361, 362, 365] },
  { key: 'sinnoh_beacon', badge: 'Beacon Badge', leader: 'Volkner', region: 'Sinnoh', type: 'electric', ace: [81, 82, 100, 101, 125, 135, 239, 310, 405, 466] },

  { key: 'unova_trio', badge: 'Trio Badge', leader: 'Cilan, Chili & Cress', region: 'Unova', type: 'grass', ace: [511, 512, 513, 514, 515, 516] },
  { key: 'unova_basic', badge: 'Basic Badge', leader: 'Lenora', region: 'Unova', type: 'normal', ace: [506, 507, 508, 519, 520, 521, 572, 573] },
  { key: 'unova_insect', badge: 'Insect Badge', leader: 'Burgh', region: 'Unova', type: 'bug', ace: [540, 541, 542, 543, 544, 545, 557, 558] },
  { key: 'unova_bolt', badge: 'Bolt Badge', leader: 'Elesa', region: 'Unova', type: 'electric', ace: [587, 595, 596, 602, 603, 604] },
  { key: 'unova_quake', badge: 'Quake Badge', leader: 'Clay', region: 'Unova', type: 'ground', ace: [524, 525, 526, 529, 530, 551, 552, 553] },
  { key: 'unova_jet', badge: 'Jet Badge', leader: 'Skyla', region: 'Unova', type: 'flying', ace: [519, 520, 521, 566, 567, 580, 581, 628, 630] },
  { key: 'unova_freeze', badge: 'Freeze Badge', leader: 'Brycen', region: 'Unova', type: 'ice', ace: [582, 583, 584, 613, 614, 615, 361, 362, 365] },
  { key: 'unova_legend', badge: 'Legend Badge', leader: 'Drayden & Iris', region: 'Unova', type: 'dragon', ace: [610, 611, 612, 621, 622, 623, 633, 634, 635] },

  { key: 'kalos_bug', badge: 'Bug Badge', leader: 'Viola', region: 'Kalos', type: 'bug', ace: [283, 284, 666, 742, 743] },
  { key: 'kalos_cliff', badge: 'Cliff Badge', leader: 'Grant', region: 'Kalos', type: 'rock', ace: [696, 697, 698, 699, 703] },
  { key: 'kalos_rumble', badge: 'Rumble Badge', leader: 'Korrina', region: 'Kalos', type: 'fighting', ace: [447, 448, 475, 701] },
  { key: 'kalos_plant', badge: 'Plant Badge', leader: 'Ramos', region: 'Kalos', type: 'grass', ace: [672, 673, 710, 711] },
  { key: 'kalos_voltage', badge: 'Voltage Badge', leader: 'Clemont', region: 'Kalos', type: 'electric', ace: [694, 695, 702, 736, 737, 738] },
  { key: 'kalos_fairy', badge: 'Fairy Badge', leader: 'Valerie', region: 'Kalos', type: 'fairy', ace: [682, 683, 684, 685, 700] },
  { key: 'kalos_psychic', badge: 'Psychic Badge', leader: 'Olympia', region: 'Kalos', type: 'psychic', ace: [677, 678, 686, 687] },
  { key: 'kalos_iceberg', badge: 'Iceberg Badge', leader: 'Wulfric', region: 'Kalos', type: 'ice', ace: [712, 713, 714, 715, 460] },

  { key: 'galar_grass', badge: 'Grass Badge', leader: 'Milo', region: 'Galar', type: 'grass', ace: [810, 811, 812, 829, 830, 840, 841, 842] },
  { key: 'galar_water', badge: 'Water Badge', leader: 'Nessa', region: 'Galar', type: 'water', ace: [816, 817, 818, 833, 834, 846, 847] },
  { key: 'galar_fire', badge: 'Fire Badge', leader: 'Kabu', region: 'Galar', type: 'fire', ace: [813, 814, 815, 837, 838, 839, 850, 851] },
  { key: 'galar_fighting', badge: 'Fighting Badge', leader: 'Bea', region: 'Galar', type: 'fighting', ace: [674, 675, 739, 740, 852, 853] },
  { key: 'galar_ghost', badge: 'Ghost Badge', leader: 'Allister', region: 'Galar', type: 'ghost', ace: [854, 855, 856, 857, 858, 859, 860, 861] },
  { key: 'galar_fairy', badge: 'Fairy Badge', leader: 'Opal', region: 'Galar', type: 'fairy', ace: [868, 869, 876, 858] },
  { key: 'galar_rock', badge: 'Rock Badge', leader: 'Gordie', region: 'Galar', type: 'rock', ace: [874, 875, 839] },
  { key: 'galar_dark', badge: 'Dark Badge', leader: 'Piers', region: 'Galar', type: 'dark', ace: [862, 863, 877] },
  { key: 'galar_dragon', badge: 'Dragon Badge', leader: 'Raihan', region: 'Galar', type: 'dragon', ace: [880, 881, 882, 883, 884, 887] },

  { key: 'paldea_bug', badge: 'Bug Badge', leader: 'Katy', region: 'Paldea', type: 'bug', ace: [917, 918, 919, 920] },
  { key: 'paldea_grass', badge: 'Grass Badge', leader: 'Brassius', region: 'Paldea', type: 'grass', ace: [928, 929, 930, 948, 949] },
  { key: 'paldea_electric', badge: 'Electric Badge', leader: 'Iono', region: 'Paldea', type: 'electric', ace: [921, 922, 923, 938, 939, 940] },
  { key: 'paldea_water', badge: 'Water Badge', leader: 'Kofu', region: 'Paldea', type: 'water', ace: [976, 977, 978, 960, 961] },
  { key: 'paldea_normal', badge: 'Normal Badge', leader: 'Larry', region: 'Paldea', type: 'normal', ace: [924, 925, 926, 927, 981, 982] },
  { key: 'paldea_ghost', badge: 'Ghost Badge', leader: 'Ryme', region: 'Paldea', type: 'ghost', ace: [971, 972, 973, 974, 975] },
  { key: 'paldea_psychic', badge: 'Psychic Badge', leader: 'Tulip', region: 'Paldea', type: 'psychic', ace: [954, 955, 956, 981] },
  { key: 'paldea_ice', badge: 'Ice Badge', leader: 'Grusha', region: 'Paldea', type: 'ice', ace: [974, 975, 996, 997, 998] },
];

GYMS.forEach((gym) => {
  const typeTheme = TYPE_THEME[gym.type] || CATEGORY_THEME.gym;
  addSet({
    key: `gym_${gym.key}`,
    name: `${gym.region} ${gym.badge.replace(' Badge', '')} Gym Set`,
    category: 'gym',
    region: gym.region,
    description: `${gym.leader}'s ${gym.type}-type gym roster. Complete the set to earn the ${gym.badge}.`,
    pokemonIds: typedRoster(gym.type, gym.ace, 10),
    badgeName: gym.badge,
    badgeFamily: 'gym',
    design: typeTheme.design,
    accent: typeTheme.accent,
    makeBadge: gym.makeBadge !== false,
  });
});

/* -------------------------------------------------------------------------- */
/* Elite Four sets                                                            */
/* -------------------------------------------------------------------------- */

const ELITE = [
  { key: 'kanto_lorelei', leader: 'Lorelei', region: 'Kanto', type: 'ice', ace: [86, 87, 124, 131] },
  { key: 'kanto_bruno', leader: 'Bruno', region: 'Kanto', type: 'fighting', ace: [56, 57, 67, 68, 95] },
  { key: 'kanto_agatha', leader: 'Agatha', region: 'Kanto', type: 'ghost', ace: [92, 93, 94, 24, 42] },
  { key: 'kanto_lance', leader: 'Lance', region: 'Kanto', type: 'dragon', ace: [130, 147, 148, 149] },

  { key: 'johto_will', leader: 'Will', region: 'Johto', type: 'psychic', ace: [124, 178, 103] },
  { key: 'johto_koga', leader: 'Koga', region: 'Johto', type: 'poison', ace: [49, 89, 110, 169] },
  { key: 'johto_bruno', leader: 'Bruno', region: 'Johto', type: 'fighting', ace: [95, 107, 68, 106] },
  { key: 'johto_karen', leader: 'Karen', region: 'Johto', type: 'dark', ace: [197, 198, 229, 359] },

  { key: 'hoenn_sidney', leader: 'Sidney', region: 'Hoenn', type: 'dark', ace: [262, 275, 359, 342] },
  { key: 'hoenn_phoebe', leader: 'Phoebe', region: 'Hoenn', type: 'ghost', ace: [354, 356, 477, 302] },
  { key: 'hoenn_glacia', leader: 'Glacia', region: 'Hoenn', type: 'ice', ace: [362, 363, 364, 365] },
  { key: 'hoenn_drake', leader: 'Drake', region: 'Hoenn', type: 'dragon', ace: [334, 372, 373, 330] },

  { key: 'sinnoh_aaron', leader: 'Aaron', region: 'Sinnoh', type: 'bug', ace: [269, 267, 416, 214] },
  { key: 'sinnoh_bertha', leader: 'Bertha', region: 'Sinnoh', type: 'ground', ace: [340, 464, 450, 389] },
  { key: 'sinnoh_flint', leader: 'Flint', region: 'Sinnoh', type: 'fire', ace: [78, 229, 136, 392] },
  { key: 'sinnoh_lucian', leader: 'Lucian', region: 'Sinnoh', type: 'psychic', ace: [203, 65, 282, 475] },

  { key: 'unova_shauntal', leader: 'Shauntal', region: 'Unova', type: 'ghost', ace: [623, 563, 609, 354] },
  { key: 'unova_marshal', leader: 'Marshal', region: 'Unova', type: 'fighting', ace: [534, 620, 539, 537] },
  { key: 'unova_grimsley', leader: 'Grimsley', region: 'Unova', type: 'dark', ace: [553, 510, 625, 359] },
  { key: 'unova_caitlin', leader: 'Caitlin', region: 'Unova', type: 'psychic', ace: [576, 579, 561, 282] },

  { key: 'kalos_malva', leader: 'Malva', region: 'Kalos', type: 'fire', ace: [668, 663, 609, 655] },
  { key: 'kalos_siebold', leader: 'Siebold', region: 'Kalos', type: 'water', ace: [693, 689, 691, 350] },
  { key: 'kalos_wikstrom', leader: 'Wikstrom', region: 'Kalos', type: 'steel', ace: [681, 212, 306, 448] },
  { key: 'kalos_drasna', leader: 'Drasna', region: 'Kalos', type: 'dragon', ace: [621, 715, 373, 334] },

  { key: 'alola_hala', leader: 'Hala', region: 'Alola', type: 'fighting', ace: [740, 739, 297, 62] },
  { key: 'alola_olivia', leader: 'Olivia', region: 'Alola', type: 'rock', ace: [745, 745, 526, 699] },
  { key: 'alola_acerola', leader: 'Acerola', region: 'Alola', type: 'ghost', ace: [770, 778, 426, 94] },
  { key: 'alola_kahili', leader: 'Kahili', region: 'Alola', type: 'flying', ace: [733, 628, 227, 279] },

  { key: 'paldea_rika', leader: 'Rika', region: 'Paldea', type: 'ground', ace: [981, 323, 750, 844] },
  { key: 'paldea_poppy', leader: 'Poppy', region: 'Paldea', type: 'steel', ace: [959, 968, 823, 983] },
  { key: 'paldea_larry', leader: 'Larry', region: 'Paldea', type: 'normal', ace: [973, 982, 925, 981] },
  { key: 'paldea_hassel', leader: 'Hassel', region: 'Paldea', type: 'dragon', ace: [998, 887, 715, 334] },
];

ELITE.forEach((member) => {
  const typeTheme = TYPE_THEME[member.type] || CATEGORY_THEME.elite;
  addSet({
    key: `elite_${member.key}`,
    name: `${member.region} ${member.leader} Elite Set`,
    category: 'elite',
    region: member.region,
    description: `${member.region} Elite Four ${member.type}-type challenge led by ${member.leader}.`,
    pokemonIds: typedRoster(member.type, member.ace, 8),
    badgeName: `${member.leader} Elite Badge`,
    badgeFamily: 'elite',
    design: typeTheme.design,
    accent: typeTheme.accent,
  });
});

/* -------------------------------------------------------------------------- */
/* Champion sets                                                              */
/* -------------------------------------------------------------------------- */

const CHAMPIONS = [
  { key: 'kanto_blue', name: 'Champion Blue', region: 'Kanto', ids: [18, 65, 112, 59, 130, 9] },
  { key: 'johto_lance', name: 'Champion Lance', region: 'Johto', ids: [130, 149, 149, 149, 6, 142] },
  { key: 'hoenn_steven', name: 'Champion Steven', region: 'Hoenn', ids: [227, 344, 306, 346, 348, 376] },
  { key: 'sinnoh_cynthia', name: 'Champion Cynthia', region: 'Sinnoh', ids: [442, 407, 468, 448, 350, 445] },
  { key: 'unova_alder', name: 'Champion Alder', region: 'Unova', ids: [617, 626, 621, 584, 589, 637] },
  { key: 'unova_iris', name: 'Champion Iris', region: 'Unova', ids: [635, 621, 567, 306, 131, 612] },
  { key: 'kalos_diantha', name: 'Champion Diantha', region: 'Kalos', ids: [701, 697, 699, 711, 706, 282] },
  { key: 'alola_kukui', name: 'Champion Kukui', region: 'Alola', ids: [745, 628, 462, 143, 724, 738] },
  { key: 'galar_leon', name: 'Champion Leon', region: 'Galar', ids: [681, 815, 887, 612, 537, 6] },
  { key: 'paldea_geeta', name: 'Champion Geeta', region: 'Paldea', ids: [956, 673, 713, 983, 976, 970] },
];

CHAMPIONS.forEach((champ) => {
  addSet({
    key: `champion_${champ.key}`,
    name: champ.name,
    category: 'champion',
    region: champ.region,
    description: `The signature team of ${champ.name}. Complete the set to claim champion honors.`,
    pokemonIds: champ.ids,
    badgeName: `${champ.region} Champion Badge`,
    badgeFamily: 'champion',
    design: 'crown',
    accent: '#fbbf24',
  });
});

/* -------------------------------------------------------------------------- */
/* Villain teams                                                              */
/* -------------------------------------------------------------------------- */

const VILLAINS = [
  { key: 'rocket', name: 'Team Rocket', region: 'Kanto', leader: 'Giovanni', ids: [112, 34, 31, 115, 53, 51] },
  { key: 'aqua', name: 'Team Aqua', region: 'Hoenn', leader: 'Archie', ids: [319, 262, 169, 365, 73, 382] },
  { key: 'magma', name: 'Team Magma', region: 'Hoenn', leader: 'Maxie', ids: [323, 262, 169, 110, 76, 383] },
  { key: 'galactic', name: 'Team Galactic', region: 'Sinnoh', leader: 'Cyrus', ids: [130, 169, 430, 461, 462, 229] },
  { key: 'plasma', name: 'Team Plasma', region: 'Unova', leader: 'Ghetsis', ids: [635, 563, 626, 604, 537, 625] },
  { key: 'flare', name: 'Team Flare', region: 'Kalos', leader: 'Lysandre', ids: [668, 701, 430, 130, 620, 717] },
  { key: 'aether', name: 'Aether Foundation', region: 'Alola', leader: 'Lusamine', ids: [760, 350, 549, 429, 36, 428] },
  { key: 'skull', name: 'Team Skull', region: 'Alola', leader: 'Guzma', ids: [768, 168, 127, 212, 284, 738] },
  { key: 'macro', name: 'Macro Cosmos', region: 'Galar', leader: 'Rose', ids: [879, 878, 858, 861, 809, 890] },
  { key: 'yell', name: 'Team Yell', region: 'Galar', leader: 'Piers', ids: [560, 687, 435, 454, 862, 877] },
  { key: 'star', name: 'Team Star', region: 'Paldea', leader: 'Penny', ids: [700, 135, 134, 136, 470, 197] },
];

VILLAINS.forEach((team) => {
  addSet({
    key: `villain_${team.key}`,
    name: team.name,
    category: 'villain',
    region: team.region,
    description: `${team.leader}'s ${team.name} command roster. Complete the set to expose the organization.`,
    pokemonIds: team.ids,
    badgeName: `${team.name} Badge`,
    badgeFamily: 'villain',
    design: 'skull',
    accent: '#dc2626',
  });
});

/* -------------------------------------------------------------------------- */
/* Battle Frontier and Contest sets                                           */
/* -------------------------------------------------------------------------- */

const FRONTIER = [
  { key: 'silver', name: 'Silver Symbol', brain: 'Salon Maiden Anabel', ids: [65, 143, 244] },
  { key: 'gold', name: 'Gold Symbol', brain: 'Salon Maiden Anabel', ids: [65, 143, 244, 243, 245] },
  { key: 'ability', name: 'Ability Symbol', brain: 'Arena Tycoon Greta', ids: [214, 292, 197] },
  { key: 'knowledge', name: 'Knowledge Symbol', brain: 'Factory Head Noland', ids: [127, 303, 85] },
  { key: 'spirit', name: 'Spirit Symbol', brain: 'Palace Maven Spenser', ids: [245, 169, 130] },
  { key: 'brave', name: 'Brave Symbol', brain: 'Pyramid King Brandon', ids: [377, 378, 379] },
  { key: 'tactics', name: 'Tactics Symbol', brain: 'Pike Queen Lucy', ids: [336, 350, 213] },
];

FRONTIER.forEach((item) => {
  addSet({
    key: `frontier_${item.key}`,
    name: `${item.name} Set`,
    category: 'frontier',
    region: 'Battle Frontier',
    description: `${item.brain}'s signature roster for the ${item.name}.`,
    pokemonIds: item.ids,
    badgeName: item.name,
    badgeFamily: 'frontier',
    design: 'compass',
    accent: '#38bdf8',
  });
});

const CONTESTS = [
  { key: 'cool', name: 'Cool Ribbon', types: ['fire', 'electric', 'dragon'] },
  { key: 'beauty', name: 'Beauty Ribbon', types: ['water', 'ice', 'fairy'] },
  { key: 'cute', name: 'Cute Ribbon', types: ['normal', 'fairy'] },
  { key: 'smart', name: 'Smart Ribbon', types: ['psychic', 'steel'] },
  { key: 'tough', name: 'Tough Ribbon', types: ['fighting', 'rock', 'ground'] },
];

CONTESTS.forEach((contest) => {
  const ids = uniq(contest.types.flatMap((type) => (finalByType.get(type) || []).slice(0, 4)));
  addSet({
    key: `contest_${contest.key}`,
    name: `${contest.name} Showcase`,
    category: 'contest',
    region: 'Contest Hall',
    description: `A curated ${contest.key} contest roster drawn from ${contest.types.join(', ')} specialists.`,
    pokemonIds: ids,
    badgeName: contest.name,
    badgeFamily: 'contest',
    design: 'ribbon',
    accent: '#ec4899',
  });
});

/* -------------------------------------------------------------------------- */
/* Legendary, mythical and mascot sets                                        */
/* -------------------------------------------------------------------------- */

const LEGENDARY_SETS = [
  { key: 'legendary_birds', name: 'Legendary Birds', ids: [144, 145, 146], design: 'wing' },
  { key: 'legendary_beasts', name: 'Legendary Beasts', ids: [243, 244, 245], design: 'bolt' },
  { key: 'tower_duo', name: 'Tower Duo', ids: [249, 250], design: 'wing' },
  { key: 'eon_duo', name: 'Eon Duo', ids: [380, 381], design: 'dragon' },
  { key: 'superancient', name: 'Superancient Trio', ids: [382, 383, 384], design: 'droplet' },
  { key: 'regi_titans', name: 'Regi Titans', ids: [377, 378, 379, 486, 894, 895], design: 'gear' },
  { key: 'lake_trio', name: 'Lake Guardians', ids: [480, 481, 482], design: 'eye' },
  { key: 'creation_trio', name: 'Creation Trio', ids: [483, 484, 487], design: 'crown' },
  { key: 'creation_quartet', name: 'Creation Quartet', ids: [483, 484, 487, 493], design: 'prism' },
  { key: 'heatran', name: 'Magma Colossus', ids: [485], design: 'flame' },
  { key: 'lunar_duo', name: 'Lunar Duo', ids: [488, 491], design: 'moon' },
  { key: 'sea_guardians', name: 'Sea Guardians', ids: [489, 490], design: 'droplet' },
  { key: 'gratitude', name: 'Gratitude Pokemon', ids: [492], design: 'leaf' },
  { key: 'swords_of_justice', name: 'Swords of Justice', ids: [638, 639, 640, 647], design: 'crown' },
  { key: 'forces_of_nature', name: 'Forces of Nature', ids: [641, 642, 645, 905], design: 'wing' },
  { key: 'tao_trio', name: 'Tao Trio', ids: [643, 644, 646], design: 'dragon' },
  { key: 'aura_trio', name: 'Aura Trio', ids: [716, 717, 718], design: 'star' },
  { key: 'life_death', name: 'Life & Death', ids: [716, 717], design: 'sun' },
  { key: 'order', name: 'Order Pokemon', ids: [718], design: 'compass' },
  { key: 'guardian_deities', name: 'Guardian Deities', ids: [785, 786, 787, 788], design: 'star' },
  { key: 'cosmog_line', name: 'Cosmog Line', ids: [789, 790, 791, 792], design: 'moon' },
  { key: 'light_trio', name: 'Light Trio', ids: [791, 792, 800], design: 'sun' },
  { key: 'mythic_alola', name: 'Alola Mythicals', ids: [801, 802, 807], design: 'prism' },
  { key: 'meltan_line', name: 'Meltan Line', ids: [808, 809], design: 'gear' },
  { key: 'hero_duo', name: 'Hero Duo', ids: [888, 889], design: 'crown' },
  { key: 'darkest_day', name: 'Darkest Day', ids: [888, 889, 890], design: 'dragon' },
  { key: 'kubfu_line', name: 'Kubfu Line', ids: [891, 892], design: 'fist' },
  { key: 'steed_duo', name: 'Steed Duo', ids: [896, 897, 898], design: 'moon' },
  { key: 'ruinous_quartet', name: 'Treasures of Ruin', ids: [1001, 1002, 1003, 1004], design: 'prism' },
  { key: 'ride_duo', name: 'Ride Legendaries', ids: [1007, 1008], design: 'wing' },
  { key: 'loyal_three', name: 'Loyal Three', ids: [1014, 1015, 1016], design: 'fang' },
  { key: 'ogre', name: 'Ogre Clan', ids: [1017], design: 'star' },
  { key: 'terastal', name: 'Terastal Legend', ids: [1024], design: 'crystal' },
  { key: 'peach', name: 'Peach Legend', ids: [1025], design: 'prism' },
  { key: 'victini', name: 'Victory Pokemon', ids: [494], design: 'star' },
  { key: 'keldeo', name: 'Colt Pokemon', ids: [647], design: 'sword' },
  { key: 'meloetta', name: 'Melody Pokemon', ids: [648], design: 'star' },
  { key: 'genesect', name: 'Paleozoic Pokemon', ids: [649], design: 'fossil' },
  { key: 'diancie', name: 'Jewel Pokemon', ids: [719], design: 'crystal' },
  { key: 'hoopa', name: 'Mischief Pokemon', ids: [720], design: 'prism' },
  { key: 'volcanion', name: 'Steam Pokemon', ids: [721], design: 'flame' },
  { key: 'zarude', name: 'Rogue Monkey', ids: [893], design: 'leaf' },
];

LEGENDARY_SETS.forEach((item) => {
  addSet({
    key: `legendary_${item.key}`,
    name: item.name,
    category: 'legendary',
    region: 'Legendary Lore',
    description: `A legendary lore collection featuring ${item.name}.`,
    pokemonIds: item.ids,
    badgeName: `${item.name} Badge`,
    badgeFamily: 'legendary',
    design: item.design || 'crown',
    accent: '#fbbf24',
  });
});

const MYTHICAL_GENERATIONS = [
  { gen: 1, name: 'Mew', ids: [151] },
  { gen: 2, name: 'Celebi', ids: [251] },
  { gen: 3, name: 'Jirachi & Deoxys', ids: [385, 386] },
  { gen: 4, name: 'Sinnoh Mythicals', ids: [489, 490, 491, 492, 493] },
  { gen: 5, name: 'Unova Mythicals', ids: [494, 647, 648, 649] },
  { gen: 6, name: 'Kalos Mythicals', ids: [719, 720, 721] },
  { gen: 7, name: 'Alola Mythicals', ids: [801, 802, 807] },
  { gen: 8, name: 'Galar Mythicals', ids: [808, 809, 893] },
  { gen: 9, name: 'Paldea Mythicals', ids: [1025] },
];

MYTHICAL_GENERATIONS.forEach((item) => {
  addSet({
    key: `mythical_gen_${item.gen}`,
    name: `Gen ${item.gen} Mythicals`,
    category: 'mythical',
    region: 'Mythical Lore',
    description: `Mythical Pokemon of generation ${item.gen}: ${item.name}.`,
    pokemonIds: item.ids,
    badgeName: `Gen ${item.gen} Mythical Badge`,
    badgeFamily: 'legendary',
    design: 'prism',
    accent: '#f472b6',
  });
});

const MASCOTS = [
  { key: 'kanto', name: 'Kanto Mascots', ids: [3, 6, 9, 25, 133, 150], design: 'pokeball' },
  { key: 'johto', name: 'Johto Mascots', ids: [249, 250, 251], design: 'wing' },
  { key: 'hoenn', name: 'Hoenn Mascots', ids: [382, 383, 384], design: 'droplet' },
  { key: 'sinnoh', name: 'Sinnoh Mascots', ids: [483, 484, 487, 493], design: 'crown' },
  { key: 'unova', name: 'Unova Mascots', ids: [643, 644, 646], design: 'dragon' },
  { key: 'kalos', name: 'Kalos Mascots', ids: [716, 717, 718], design: 'star' },
  { key: 'alola', name: 'Alola Mascots', ids: [791, 792, 800], design: 'moon' },
  { key: 'galar', name: 'Galar Mascots', ids: [888, 889, 890], design: 'crown' },
  { key: 'paldea', name: 'Paldea Mascots', ids: [1007, 1008, 1024], design: 'crystal' },
];

MASCOTS.forEach((item) => {
  addSet({
    key: `mascot_${item.key}`,
    name: item.name,
    category: 'mascot',
    region: 'Box Legends',
    description: `The box-legendary mascots of ${item.name.replace(' Mascots', '')}.`,
    pokemonIds: item.ids,
    badgeName: `${item.name.replace(' Mascots', '')} Mascot Badge`,
    badgeFamily: 'legendary',
    design: item.design,
    accent: '#fbbf24',
  });
});

/* -------------------------------------------------------------------------- */
/* Starter, fossil, pseudo, eevee, baby, ultra beast and paradox sets          */
/* -------------------------------------------------------------------------- */

const STARTERS = [
  { gen: 1, ids: [1, 4, 7] },
  { gen: 2, ids: [152, 155, 158] },
  { gen: 3, ids: [252, 255, 258] },
  { gen: 4, ids: [387, 390, 393] },
  { gen: 5, ids: [495, 498, 501] },
  { gen: 6, ids: [650, 653, 656] },
  { gen: 7, ids: [722, 725, 728] },
  { gen: 8, ids: [810, 813, 816] },
  { gen: 9, ids: [906, 909, 912] },
];

STARTERS.forEach((item) => {
  addSet({
    key: `starter_gen_${item.gen}`,
    name: `Gen ${item.gen} Starter Legacy`,
    category: 'starter',
    region: `Generation ${item.gen}`,
    description: `Every fully evolved starter line from generation ${item.gen}.`,
    pokemonIds: families(item.ids),
    badgeName: `Gen ${item.gen} Starter Badge`,
    badgeFamily: 'special',
    design: 'pokeball',
    accent: '#ef4444',
  });
});

addSet({
  key: 'starter_legacy',
  name: 'Starter Legacy',
  category: 'starter',
  region: 'All Regions',
  description: 'Every starter family from Kanto to Paldea.',
  pokemonIds: uniq(STARTERS.flatMap((item) => families(item.ids))),
  badgeName: 'Starter Legacy Badge',
  badgeFamily: 'special',
  design: 'pokeball',
  accent: '#ef4444',
});

const FOSSIL_GENERATIONS = [
  { key: 'kanto', name: 'Kanto Fossils', ids: [138, 140, 142] },
  { key: 'hoenn', name: 'Hoenn Fossils', ids: [345, 347] },
  { key: 'sinnoh', name: 'Sinnoh Fossils', ids: [408, 410] },
  { key: 'unova', name: 'Unova Fossils', ids: [564, 566] },
  { key: 'kalos', name: 'Kalos Fossils', ids: [696, 698] },
  { key: 'galar', name: 'Galar Fossils', ids: [880, 881, 882, 883] },
];

FOSSIL_GENERATIONS.forEach((item) => {
  addSet({
    key: `fossil_${item.key}`,
    name: item.name,
    category: 'fossil',
    region: 'Fossil Revival',
    description: `Revived fossil families from ${item.name.replace(' Fossils', '')}.`,
    pokemonIds: families(item.ids),
    badgeName: `${item.name} Badge`,
    badgeFamily: 'special',
    design: 'fossil',
    accent: '#c2a26b',
  });
});

addSet({
  key: 'fossil_revival',
  name: 'Fossil Revival',
  category: 'fossil',
  region: 'All Regions',
  description: 'Every resurrected fossil Pokemon across the generations.',
  pokemonIds: families(FOSSIL_GENERATIONS.flatMap((item) => item.ids)),
  badgeName: 'Fossil Revival Badge',
  badgeFamily: 'special',
  design: 'fossil',
  accent: '#c2a26b',
});

const PSEUDO_LINES = [
  { key: 'dragonite', name: 'Dragonite Line', ids: [147] },
  { key: 'tyranitar', name: 'Tyranitar Line', ids: [246] },
  { key: 'salamence', name: 'Salamence Line', ids: [371] },
  { key: 'metagross', name: 'Metagross Line', ids: [374] },
  { key: 'garchomp', name: 'Garchomp Line', ids: [443] },
  { key: 'hydreigon', name: 'Hydreigon Line', ids: [633] },
  { key: 'goodra', name: 'Goodra Line', ids: [704] },
  { key: 'kommoo', name: 'Kommo-o Line', ids: [782] },
  { key: 'dragapult', name: 'Dragapult Line', ids: [885] },
  { key: 'baxcalibur', name: 'Baxcalibur Line', ids: [996] },
];

PSEUDO_LINES.forEach((item) => {
  addSet({
    key: `pseudo_${item.key}`,
    name: item.name,
    category: 'pseudo',
    region: 'Pseudo-Legend Lore',
    description: `The complete ${item.name} family.`,
    pokemonIds: families(item.ids),
    badgeName: `${item.name} Badge`,
    badgeFamily: 'special',
    design: 'fang',
    accent: '#8b5cf6',
  });
});

addSet({
  key: 'pseudo_apex',
  name: 'Pseudo-Legend Apex',
  category: 'pseudo',
  region: 'All Regions',
  description: 'Every pseudo-legendary family in one apex collection.',
  pokemonIds: families(PSEUDO_LINES.flatMap((item) => item.ids)),
  badgeName: 'Pseudo-Legend Apex Badge',
  badgeFamily: 'special',
  design: 'fang',
  accent: '#8b5cf6',
});

addSet({
  key: 'eevee_prism',
  name: 'Eeveelution Prism',
  category: 'eevee',
  region: 'Evolution Lore',
  description: 'Eevee and every Eeveelution in one rainbow family.',
  pokemonIds: [133, 134, 135, 136, 196, 197, 470, 471, 700],
  badgeName: 'Eeveelution Prism Badge',
  badgeFamily: 'special',
  design: 'star',
  accent: '#fbbf24',
});

addSet({
  key: 'baby_bond',
  name: 'Baby Pokemon Bond',
  category: 'baby',
  region: 'Nursery',
  description: 'Every baby Pokemon that grows through friendship and care.',
  pokemonIds: [172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 438, 439, 440, 446, 458, 848],
  badgeName: 'Baby Pokemon Bond Badge',
  badgeFamily: 'special',
  design: 'heart',
  accent: '#f9a8d4',
});

addSet({
  key: 'ultra_beast_rift',
  name: 'Ultra Beast Rift',
  category: 'ultrabeast',
  region: 'Ultra Space',
  description: 'Every Ultra Beast that crossed through the Ultra Wormholes.',
  pokemonIds: [793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806],
  badgeName: 'Ultra Beast Rift Badge',
  badgeFamily: 'special',
  design: 'eye',
  accent: '#a855f7',
});

const PAST_PARADOX = [984, 985, 986, 987, 988, 989, 1005, 1009, 1020, 1021];
const FUTURE_PARADOX = [990, 991, 992, 993, 994, 995, 1006, 1010, 1022, 1023];

addSet({
  key: 'paradox_past',
  name: 'Ancient Paradox',
  category: 'paradox',
  region: 'Area Zero',
  description: 'Prehistoric Paradox Pokemon summoned from ancient dreams.',
  pokemonIds: PAST_PARADOX,
  badgeName: 'Ancient Paradox Badge',
  badgeFamily: 'special',
  design: 'prism',
  accent: '#fb923c',
});

addSet({
  key: 'paradox_future',
  name: 'Future Paradox',
  category: 'paradox',
  region: 'Area Zero',
  description: 'Futuristic Paradox Pokemon built from tomorrow\'s technology.',
  pokemonIds: FUTURE_PARADOX,
  badgeName: 'Future Paradox Badge',
  badgeFamily: 'special',
  design: 'gear',
  accent: '#22d3ee',
});

addSet({
  key: 'paradox_anomaly',
  name: 'Paradox Anomaly',
  category: 'paradox',
  region: 'Area Zero',
  description: 'Every ancient and future Paradox Pokemon in one anomaly.',
  pokemonIds: [...PAST_PARADOX, ...FUTURE_PARADOX],
  badgeName: 'Paradox Anomaly Badge',
  badgeFamily: 'special',
  design: 'prism',
  accent: '#22d3ee',
});

/* -------------------------------------------------------------------------- */
/* Regional forms, Mega Evolution and Gigantamax                              */
/* -------------------------------------------------------------------------- */

const regionalForms = forms.filter((form) => form.kind === 'regional');
const regionalLabels = [...new Set(regionalForms.map((form) => form.label))];

regionalLabels.forEach((label) => {
  const ids = uniq(regionalForms.filter((form) => form.label === label).map((form) => form.dexNo));
  addSet({
    key: `regional_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: `${label} Regional Forms`,
    category: 'regional',
    region: label,
    description: `Every ${label} regional variant family.`,
    pokemonIds: ids,
    badgeName: `${label} Regional Badge`,
    badgeFamily: 'special',
    design: 'compass',
    accent: '#34d399',
  });
});

addSet({
  key: 'regional_all',
  name: 'Regional Variant Atlas',
  category: 'regional',
  region: 'All Regions',
  description: 'Every Alolan, Galarian, Hisuian and Paldean regional variant.',
  pokemonIds: uniq(regionalForms.map((form) => form.dexNo)),
  badgeName: 'Regional Variant Badge',
  badgeFamily: 'special',
  design: 'compass',
  accent: '#34d399',
});

const megaIds = uniq(forms.filter((form) => form.kind === 'mega').map((form) => form.dexNo));
const megaGens = [...new Set(megaIds.map((id) => speciesMeta[String(id)]?.gen).filter(Boolean))].sort((a, b) => a - b);

megaGens.forEach((gen) => {
  const ids = megaIds.filter((id) => speciesMeta[String(id)]?.gen === gen);
  addSet({
    key: `mega_gen_${gen}`,
    name: `Gen ${gen} Mega Evolution`,
    category: 'mega',
    region: `Generation ${gen}`,
    description: `Generation ${gen} Pokemon capable of Mega Evolution.`,
    pokemonIds: ids,
    badgeName: `Gen ${gen} Mega Badge`,
    badgeFamily: 'special',
    design: 'crystal',
    accent: '#22d3ee',
  });
});

addSet({
  key: 'mega_all',
  name: 'Mega Evolution Archive',
  category: 'mega',
  region: 'All Regions',
  description: 'Every Pokemon with a Mega Evolution.',
  pokemonIds: megaIds,
  badgeName: 'Mega Evolution Badge',
  badgeFamily: 'special',
  design: 'crystal',
  accent: '#22d3ee',
});

const gmaxIds = uniq(forms.filter((form) => form.kind === 'gmax').map((form) => form.dexNo));
const gmaxGens = [...new Set(gmaxIds.map((id) => speciesMeta[String(id)]?.gen).filter(Boolean))].sort((a, b) => a - b);

gmaxGens.forEach((gen) => {
  const ids = gmaxIds.filter((id) => speciesMeta[String(id)]?.gen === gen);
  addSet({
    key: `gmax_gen_${gen}`,
    name: `Gen ${gen} Gigantamax`,
    category: 'gmax',
    region: `Generation ${gen}`,
    description: `Generation ${gen} Pokemon with a Gigantamax form.`,
    pokemonIds: ids,
    badgeName: `Gen ${gen} Gigantamax Badge`,
    badgeFamily: 'special',
    design: 'gear',
    accent: '#ef4444',
  });
});

addSet({
  key: 'gmax_all',
  name: 'Gigantamax Colossus',
  category: 'gmax',
  region: 'All Regions',
  description: 'Every Pokemon capable of Gigantamax.',
  pokemonIds: gmaxIds,
  badgeName: 'Gigantamax Colossus Badge',
  badgeFamily: 'special',
  design: 'gear',
  accent: '#ef4444',
});

/* -------------------------------------------------------------------------- */
/* Type mastery badges and milestone badges                                   */
/* -------------------------------------------------------------------------- */

const typeBadges = TYPES.map((type) => {
  const theme = TYPE_THEME[type];
  return {
    id: `badge_lore_type_${type}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Type Master Badge`,
    region: 'Type Mastery',
    family: 'type',
    design: theme.design,
    accent: theme.accent,
    description: `Complete every ${type}-type card in the PokAcdex.`,
    criteria: 'collection',
    pokemonIds: pokemon.filter((p) => p.types.includes(type)).map((p) => Number(p.id)),
  };
});

const dexMilestones = [
  { id: 'kanto', name: 'Kanto Dex Milestone', threshold: 151 },
  { id: 'johto', name: 'Johto Dex Milestone', threshold: 251 },
  { id: 'hoenn', name: 'Hoenn Dex Milestone', threshold: 386 },
  { id: 'sinnoh', name: 'Sinnoh Dex Milestone', threshold: 493 },
  { id: 'unova', name: 'Unova Dex Milestone', threshold: 649 },
  { id: 'kalos', name: 'Kalos Dex Milestone', threshold: 721 },
  { id: 'alola', name: 'Alola Dex Milestone', threshold: 809 },
  { id: 'galar', name: 'Galar Dex Milestone', threshold: 905 },
  { id: 'paldea', name: 'Paldea Dex Milestone', threshold: 1025 },
];

const milestoneBadges = [
  ...dexMilestones.map((item) => ({
    id: `badge_lore_milestone_dex_${item.id}`,
    name: item.name,
    region: 'Dex Milestone',
    family: 'milestone',
    design: 'medal',
    accent: '#fbbf24',
    description: `Own ${item.threshold} unique Pokemon cards.`,
    criteria: 'ownedCount',
    threshold: item.threshold,
    pokemonIds: [],
  })),
  ...[1, 10, 50, 100].map((threshold) => ({
    id: `badge_lore_milestone_shiny_${threshold}`,
    name: `${threshold} Shiny Milestone`,
    region: 'Shiny Milestone',
    family: 'milestone',
    design: 'star',
    accent: '#f472b6',
    description: `Own ${threshold} shiny Pokemon cards.`,
    criteria: 'shinyCount',
    threshold,
    pokemonIds: [],
  })),
  ...[1, 10, 50, 100].map((threshold) => ({
    id: `badge_lore_milestone_maxed_${threshold}`,
    name: `${threshold} Max Star Milestone`,
    region: 'Mastery Milestone',
    family: 'milestone',
    design: 'crown',
    accent: '#fbbf24',
    description: `Max out ${threshold} cards at 20 stars.`,
    criteria: 'maxedCount',
    threshold,
    pokemonIds: [],
  })),
];

/* -------------------------------------------------------------------------- */
/* Build output                                                               */
/* -------------------------------------------------------------------------- */

const seenCollectionIds = new Set();
const collections = sets.map((set) => {
  const id = `lore_${set.key}`;
  if (seenCollectionIds.has(id)) throw new Error(`Duplicate collection id: ${id}`);
  seenCollectionIds.add(id);
  if (set.pokemonIds.length === 0) throw new Error(`Empty roster for ${id}`);
  return {
    id,
    name: set.name,
    category: set.category,
    description: set.description,
    pokemonIds: set.pokemonIds,
  };
});

const loreBadges = [
  ...sets
    .filter((set) => set.makeBadge)
    .map((set) => {
      const id = `badge_lore_${set.key}`;
      if (set.pokemonIds.length === 0) throw new Error(`Empty badge roster for ${id}`);
      return {
        id,
        name: set.badgeName,
        region: set.region,
        family: set.badgeFamily,
        design: set.design,
        accent: set.accent,
        description: set.description,
        criteria: 'collection',
        pokemonIds: set.pokemonIds,
      };
    }),
  ...typeBadges,
  ...milestoneBadges,
];

const seenBadgeIds = new Set();
loreBadges.forEach((badge) => {
  if (seenBadgeIds.has(badge.id)) throw new Error(`Duplicate badge id: ${badge.id}`);
  seenBadgeIds.add(badge.id);
});

fs.writeFileSync(path.join(dataDir, 'loreCollections.json'), `${JSON.stringify(collections, null, 2)}\n`, 'utf-8');
fs.writeFileSync(path.join(dataDir, 'loreBadges.json'), `${JSON.stringify(loreBadges, null, 2)}\n`, 'utf-8');

console.log(`Generated ${collections.length} lore collections.`);
console.log(`Generated ${loreBadges.length} lore badges.`);
console.log(`Category counts: ${[...new Set(collections.map((c) => c.category))].map((cat) => `${cat}=${collections.filter((c) => c.category === cat).length}`).join(', ')}`);

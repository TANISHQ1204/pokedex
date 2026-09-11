import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.cache', 'forms');
const OUTPUT_PATH = path.join(ROOT, 'src/data/forms.json');

const HP_MULTIPLIER = 1.2;
const CONCURRENCY_LIMIT = 10;
const BATCH_DELAY_MS = 40;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const pokemonList = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pokemon.json'), 'utf8'));
const speciesMeta = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/speciesMeta.json'), 'utf8'));

// Map a *species* name (e.g. 'deoxys', 'mimikyu') to its base national dex id,
// using the offline species cache. (pokemon.json stores form-qualified default
// names like 'deoxys-normal', so it cannot be used for this lookup directly.)
const SPECIES_DIR = path.join(__dirname, '.cache', 'species');
const nameToId = {};
const baseById = {};
for (const p of pokemonList) baseById[p.id] = p;
for (const file of fs.readdirSync(SPECIES_DIR)) {
  if (!/^\d+\.json$/.test(file)) continue;
  const id = Number(file.replace('.json', ''));
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(SPECIES_DIR, file), 'utf8'));
    if (raw && typeof raw.name === 'string') nameToId[raw.name] = id;
  } catch (_) {
    /* ignore a corrupt cache file */
  }
}

function baseStatTotal(pkmn) {
  const s = pkmn && pkmn.stats ? pkmn.stats : {};
  return (
    (Number(s.hp) || 0) +
    (Number(s.attack) || 0) +
    (Number(s.defense) || 0) +
    (Number(s.specialAttack) || 0) +
    (Number(s.specialDefense) || 0) +
    (Number(s.speed) || 0)
  );
}

function capTitle(str) {
  return str
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Canonical real Mega Evolutions + Primal Reversion (the only `-mega`-suffixed
// resources that exist in the official games). Every other `-mega*` resource in
// PokeAPI (clefable-mega, raichu-mega-x, garchomp-mega-z, ...) is community
// fan data and must NEVER be draftable.
const realMegas = new Set([
  'venusaur-mega', 'charizard-mega-x', 'charizard-mega-y', 'blastoise-mega',
  'beedrill-mega', 'pidgeot-mega', 'alakazam-mega', 'slowbro-mega', 'gengar-mega',
  'kangaskhan-mega', 'pinsir-mega', 'gyarados-mega', 'aerodactyl-mega',
  'mewtwo-mega-x', 'mewtwo-mega-y', 'ampharos-mega', 'steelix-mega', 'scizor-mega',
  'heracross-mega', 'houndoom-mega', 'tyranitar-mega', 'sceptile-mega',
  'blaziken-mega', 'swampert-mega', 'gardevoir-mega', 'sableye-mega', 'mawile-mega',
  'aggron-mega', 'medicham-mega', 'manectric-mega', 'sharpedo-mega', 'camerupt-mega',
  'altaria-mega', 'banette-mega', 'absol-mega', 'glalie-mega', 'salamence-mega',
  'metagross-mega', 'latias-mega', 'latios-mega', 'rayquaza-mega', 'lopunny-mega',
  'garchomp-mega', 'lucario-mega', 'abomasnow-mega', 'gallade-mega', 'audino-mega',
  'diancie-mega', 'kyogre-primal', 'groudon-primal',
]);

// Pure-cosmetic skins: identical stats AND types to an already-available entry
// (dress-up, colors, gender, event hats). Deliberately excluded from the pool.
const cosmeticSkip = new Set([
  'pikachu-rock-star', 'pikachu-belle', 'pikachu-pop-star', 'pikachu-phd',
  'pikachu-libre', 'pikachu-cosplay',
  'pikachu-original-cap', 'pikachu-hoenn-cap', 'pikachu-sinnoh-cap',
  'pikachu-unova-cap', 'pikachu-kalos-cap', 'pikachu-alola-cap',
  'pikachu-partner-cap', 'pikachu-world-cap', 'pikachu-starter', 'eevee-starter',
  'minior-orange-meteor', 'minior-yellow-meteor', 'minior-green-meteor',
  'minior-blue-meteor', 'minior-indigo-meteor', 'minior-violet-meteor',
  'minior-red', 'minior-orange', 'minior-yellow', 'minior-green', 'minior-blue',
  'minior-indigo', 'minior-violet',
  'squawkabilly-blue-plumage', 'squawkabilly-yellow-plumage', 'squawkabilly-white-plumage',
  'oinkologne-female', 'indeedee-female', 'meowstic-female', 'basculin-blue-striped',
  'tatsugiri-droopy', 'tatsugiri-stretchy', 'dudunsparce-three-segment',
  'maushold-family-of-three', 'greninja-battle-bond', 'rockruff-own-tempo',
  'cramorant-gulping', 'cramorant-gorging',
  'zygarde-10-power-construct', 'zygarde-50-power-construct',
]);

// Intro-generation overrides where a form's debut generation differs from its
// base species' generation (the regional/mega/gmax generations are hardcoded in
// classify(); these cover the remaining stragglers).
const genOverrides = {
  'zygarde-complete': 7, // debuted in Sun/Moon (Gen 7), base Zygarde is Gen 6
  'dialga-origin': 8, // Origin Forme debuted in Legends: Arceus
  'palkia-origin': 8,
  'ursaluna-bloodmoon': 9, // debuted in the Gen 9 Teal Mask DLC
  'marowak-totem': 7, // Alolan Marowak totem debuted in Gen 7
};

const displayOverrides = {
  'tauros-paldea-combat-breed': 'Paldean Tauros (Combat Breed)',
  'tauros-paldea-blaze-breed': 'Paldean Tauros (Blaze Breed)',
  'tauros-paldea-aqua-breed': 'Paldean Tauros (Aqua Breed)',
  'darmanitan-galar-standard': 'Galarian Darmanitan',
  'darmanitan-galar-zen': 'Galarian Darmanitan (Zen)',
  'darmanitan-zen': 'Darmanitan (Zen)',
  'floette-eternal': 'Eternal Floette',
  'greninja-ash': 'Ash-Greninja',
  'zygarde-10': 'Zygarde 10%',
  'zygarde-complete': 'Zygarde Complete',
  'ogerpon-wellspring-mask': 'Ogerpon (Wellspring Mask)',
  'ogerpon-hearthflame-mask': 'Ogerpon (Hearthflame Mask)',
  'ogerpon-cornerstone-mask': 'Ogerpon (Cornerstone Mask)',
  'terapagos-terastal': 'Terapagos (Terastal)',
  'terapagos-stellar': 'Terapagos (Stellar)',
  'koraidon-limited-build': 'Koraidon (Limited Build)',
  'koraidon-sprinting-build': 'Koraidon (Sprinting Build)',
  'koraidon-swimming-build': 'Koraidon (Swimming Build)',
  'koraidon-gliding-build': 'Koraidon (Gliding Build)',
  'miraidon-low-power-mode': 'Miraidon (Low Power Mode)',
  'miraidon-drive-mode': 'Miraidon (Drive Mode)',
  'miraidon-aquatic-mode': 'Miraidon (Aquatic Mode)',
  'miraidon-glide-mode': 'Miraidon (Glide Mode)',
  'gimmighoul-roaming': 'Gimmighoul (Roaming)',
  'palafin-hero': 'Palafin (Hero)',
  'basculegion-female': 'Basculegion (Female)',
  'wormadam-sandy': 'Wormadam (Sandy Cloak)',
  'wormadam-trash': 'Wormadam (Trash Cloak)',
  'meloetta-pirouette': 'Meloetta (Pirouette)',
  'keldeo-resolute': 'Keldeo (Resolute)',
  'raticate-totem-alola': 'Alolan Raticate (Totem)',
  'marowak-totem': 'Alolan Marowak (Totem)',
};

const REGIONAL = { alola: 'Alolan', galar: 'Galarian', hisui: 'Hisuian', paldea: 'Paldean' };

function classify(name) {
  if (/-(gmax)$/.test(name)) return { kind: 'gmax', label: 'Gigantamax', gen: 8 };
  for (const [suffix, label] of Object.entries(REGIONAL)) {
    if (new RegExp(`-${suffix}(-|$)`).test(name)) {
      const isTotem = /-totem/.test(name);
      return {
        kind: isTotem ? 'totem' : 'regional',
        label,
        gen: { alola: 7, galar: 8, hisui: 8, paldea: 9 }[suffix],
      };
    }
  }
  if (/-totem/.test(name)) return { kind: 'totem', label: 'Totem', gen: 7 };
  if (realMegas.has(name)) {
    if (name === 'kyogre-primal' || name === 'groudon-primal') {
      return { kind: 'primal', label: 'Primal', gen: 6 };
    }
    return { kind: 'mega', label: 'Mega', gen: 6 };
  }
  return { kind: 'form', label: 'Alternate Form', gen: null };
}

function displayFor(name, cls) {
  if (displayOverrides[name]) return displayOverrides[name];
  if (cls.kind === 'mega') {
    const xy = name.match(/^(.+)-mega-([xy])$/);
    if (xy) return `Mega ${capTitle(xy[1])} ${xy[2].toUpperCase()}`;
    const plain = name.match(/^(.+)-mega$/);
    return plain ? `Mega ${capTitle(plain[1])}` : capTitle(name);
  }
  if (cls.kind === 'primal') {
    const m = name.match(/^(.+)-primal$/);
    return m ? `Primal ${capTitle(m[1])}` : capTitle(name);
  }
  if (cls.kind === 'regional') {
    const suffix = ['alola', 'galar', 'hisui', 'paldea'].find((s) => new RegExp(`-${s}(-|$)`).test(name));
    const cleanBase = name.replace(new RegExp(`-${suffix}.*$`), '');
    return `${REGIONAL[suffix]} ${capTitle(cleanBase)}`;
  }
  if (cls.kind === 'gmax') {
    return `Gigantamax ${capTitle(name.replace(/-(gmax)$/, ''))}`;
  }
  if (cls.kind === 'totem') {
    return `${capTitle(name.replace('-totem', ''))} (Totem)`;
  }
  return capTitle(name);
}

async function fetchWithCache(url, cachePath, retries = 5, delay = 500) {
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (_) {
      // corrupt cache — refetch
    }
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = delay * Math.pow(2, attempt);
        console.warn(`[429] retrying ${url} in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      fs.writeFileSync(cachePath, JSON.stringify(data), 'utf8');
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function processForm(name, cls) {
  if (cosmeticSkip.has(name)) return null;
  const cachePath = path.join(CACHE_DIR, `${name}.json`);
  const d = await fetchWithCache(`https://pokeapi.co/api/v2/pokemon/${name}`, cachePath);

  const baseId = nameToId[d.species && d.species.name];
  if (!baseId) {
    console.warn(`SKIP ${name}: no base species mapping for "${d.species && d.species.name}"`);
    return null;
  }

  const meta = speciesMeta[baseId] || {};
  const generation = cls.gen != null ? cls.gen : genOverrides[name] || meta.gen || Math.ceil(baseId / 151);

  const baseStats = {};
  (d.stats || []).forEach((s) => {
    baseStats[s.stat && s.stat.name] = s.base_stat;
  });
  const stats = {
    hp: Math.round((baseStats['hp'] || 0) * HP_MULTIPLIER),
    attack: baseStats['attack'] || 0,
    defense: baseStats['defense'] || 0,
    specialAttack: baseStats['special-attack'] || 0,
    specialDefense: baseStats['special-defense'] || 0,
    speed: baseStats['speed'] || 0,
  };

  const art = d.sprites && d.sprites.other ? d.sprites.other : {};
  let normal =
    (d.sprites &&
      (d.sprites.front_default ||
        art['official-artwork']?.front_default ||
        art.home?.front_default ||
        art.dream_world?.front_default ||
        d.sprites.front_shiny ||
        '')) || '';
  let shiny =
    (d.sprites &&
      (d.sprites.front_shiny ||
        art['official-artwork']?.front_shiny ||
        art.home?.front_shiny ||
        art.dream_world?.front_shiny ||
        normal)) ||
    normal;

  // Last-resort fallback: reuse the base species artwork so the entry still has
  // an image (PokeAPI ships some forms, e.g. the Koraidon/Miraidon build modes,
  // with no sprite data at all).
  const baseEntry = baseById[baseId];
  if (!normal && baseEntry) {
    normal = baseEntry.sprites.normal || baseEntry.sprites.shiny || '';
    if (!shiny) shiny = baseEntry.sprites.shiny || baseEntry.sprites.normal || '';
  }

  return {
    id: d.id,
    dexNo: baseId,
    name,
    display: displayFor(name, cls),
    kind: cls.kind,
    label: cls.label,
    generation,
    rarer: !!meta.rarer,
    color: meta.color || 'unknown',
    genus: meta.genus || '',
    types: (d.types || []).map((t) => t.type.name),
    stats,
    sprites: { normal, shiny },
    bst: baseStatTotal({ stats }),
  };
}

async function main() {
  console.log('Fetching pokemon index to enumerate form resources...');
  const idx = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000').then((r) => r.json());
  const forms = idx.results.map((r, i) => ({ name: r.name, id: i + 1 })).filter((x) => x.id > 1025);
  console.log(`Total form resources: ${forms.length}`);

  const planned = forms.filter((f) => {
    const cls = classify(f.name);
    return !cosmeticSkip.has(f.name) && csNotFakeMega(f.name);
  });
  console.log(`Planned after cosmetic/fake filter: ${planned.length}`);

  const results = [];
  for (let i = 0; i < planned.length; i += CONCURRENCY_LIMIT) {
    const batch = planned.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(async (f) => {
        const cls = classify(f.name);
        try {
          const entry = await processForm(f.name, cls);
          if (entry) {
            if (!(entry.sprites.normal || entry.sprites.shiny)) {
              console.warn(`⚠  no sprite for ${f.name} — keeping with empty art anyway`);
            }
            return entry;
          }
          return null;
        } catch (err) {
          console.error(`Error processing ${f.name}:`, err.message);
          return null;
        }
      })
    );
    batchResults.forEach((r) => r && results.push(r));
    if (BATCH_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
    console.log(`[Progress ${results.length}/${planned.length}]`);
  }

  results.sort((a, b) => a.id - b.id);

  // Counts by kind for the final report
  const byKind = {};
  results.forEach((e) => {
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  });

  const fakeMegasLeft = results.filter((e) => /-mega/.test(e.name) && !realMegas.has(e.name)).length;

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nWrote ${results.length} forms to ${OUTPUT_PATH}`);
  console.log('By kind:', JSON.stringify(byKind));
  console.log(`Fake megas accidentally kept: ${fakeMegasLeft}`);
}

function csNotFakeMega(name) {
  return !(/-mega/.test(name) && !realMegas.has(name));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
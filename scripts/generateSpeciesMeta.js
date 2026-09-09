import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECIES_DIR = path.join(__dirname, '.cache/species');
const OUTPUT_PATH = path.join(__dirname, '../src/data/speciesMeta.json');

function generationFromUrl(url) {
  const match = url ? url.match(/\/generation\/(\d+)\//) : null;
  return match ? parseInt(match[1], 10) : null;
}

function main() {
  const meta = {};

  for (let id = 1; id <= 1025; id++) {
    const speciesPath = path.join(SPECIES_DIR, `${id}.json`);
    if (!fs.existsSync(speciesPath)) continue;

    const raw = JSON.parse(fs.readFileSync(speciesPath, 'utf-8'));
    const enGenus = (raw.genera || []).find((g) => g.language && g.language.name === 'en');
    const gen = generationFromUrl(raw.generation && raw.generation.url);

    meta[id] = {
      color: (raw.color && raw.color.name) || 'unknown',
      gen: gen || Math.ceil(id / 151),
      genus: (enGenus && enGenus.genus) || '',
      rarer: !!(raw.is_legendary || raw.is_mythical),
    };
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(meta), 'utf-8');
  console.log(`Wrote ${Object.keys(meta).length} species entries to ${OUTPUT_PATH}`);
}

main();
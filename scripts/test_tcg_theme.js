import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passed++;
  } else {
    console.error(`[FAIL] ${description}`);
    failed++;
  }
}

console.log('--- RUNNING MODERN DIGITAL TCG THEME AUDIT ---');

const cssPath = path.resolve('src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// 1. Audit Fonts
assert(cssContent.includes('Outfit') && cssContent.includes('Rajdhani'), 'Google Fonts Outfit & Rajdhani imported in index.css');
assert(cssContent.includes('.stat-number-condensed'), 'Condensed stat typography class (.stat-number-condensed) exists');

// 2. Audit Physical TCG Card Base & Rarity System
assert(cssContent.includes('.tcg-card'), 'Physical TCG card base style (.tcg-card) exists');
assert(cssContent.includes('.rarity-card-common'), 'Common rarity style (.rarity-card-common) exists');
assert(cssContent.includes('.rarity-card-uncommon'), 'Uncommon rarity style (.rarity-card-uncommon) exists');
assert(cssContent.includes('.rarity-card-rare'), 'Rare rarity style (.rarity-card-rare) exists');
assert(cssContent.includes('.rarity-card-legendary'), 'Legendary rarity style (.rarity-card-legendary) exists');
assert(cssContent.includes('.rarity-card-shiny'), 'Shiny rarity style (.rarity-card-shiny) exists');

// 3. Audit Holographic Rainbow Shimmer Sheen
assert(cssContent.includes('.holo-shimmer-effect') && cssContent.includes('holoSheen'), 'Holographic rainbow shimmer animation (holoSheen) exists');

// 4. Audit Collection Component usage
const collectionPath = path.resolve('src/pages/Collection.jsx');
const collectionContent = fs.readFileSync(collectionPath, 'utf-8');

assert(collectionContent.includes('tcg-card') && collectionContent.includes('rarityClass'), 'Collection.jsx applies physical tcg-card & rarity classes');
assert(collectionContent.includes('stat-number-condensed'), 'Collection.jsx applies condensed stat typography');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

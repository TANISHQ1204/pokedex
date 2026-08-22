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

console.log('--- RUNNING CARD PULL REVEAL ANIMATIONS AUDIT ---');

const cssPath = path.resolve('src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// 1. Audit Star-Level-Up Animation CSS
assert(cssContent.includes('.star-upgrade-burst') && cssContent.includes('starBurstPop'), 'Star upgrade burst animation exists');
assert(cssContent.includes('.card-star-glow') && cssContent.includes('cardStarGlowPulse'), 'Card star golden aura glow animation exists');

// 2. Audit Shiny Transformation Sequence CSS
assert(cssContent.includes('.shiny-transform-flash') && cssContent.includes('shinyTransformFlashAnim'), 'Shiny transformation flash overlay exists');
assert(cssContent.includes('.shiny-sprite-transform') && cssContent.includes('shinySpriteBloom'), 'Shiny sprite transform bloom animation exists');

// 3. Check Card Reveal Component structure
const revealPath = path.resolve('src/components/CardPullReveal.jsx');
const revealContent = fs.readFileSync(revealPath, 'utf-8');

assert(revealContent.includes('isShinyTransforming') && revealContent.includes('shiny-transform-flash'), 'CardPullReveal handles live shiny transformation state & flash');
assert(revealContent.includes('isStarBursting') && revealContent.includes('star-upgrade-burst'), 'CardPullReveal handles star upgrade burst on new star icon');
assert(revealContent.includes('displayedSprite'), 'CardPullReveal dynamically updates sprite artwork on transformation');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

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

console.log('--- RUNNING VISUAL EFFECTS & CSS ANIMATION AUDIT ---');

const cssPath = path.resolve('src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// 1. Audit all 18 move types for projectiles
const moveTypes = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

console.log('\nChecking projectile styles for all 18 Pokémon types...');
moveTypes.forEach((type) => {
  const className = `.projectile-${type}`;
  assert(cssContent.includes(className), `CSS includes ${className} projectile animation`);
});

// 2. Audit Status Condition visual effect classes & keyframes
console.log('\nChecking status condition visual effect overlays & keyframe animations...');
assert(cssContent.includes('.status-overlay-frz'), 'Freeze cyan ice tint overlay class exists');
assert(cssContent.includes('.status-overlay-slp') && cssContent.includes('zzzFloat'), 'Sleep Zzz floating animation exists');
assert(cssContent.includes('.confusion-dizzy-container') && cssContent.includes('confusionSwirl'), 'Confusion dizzy stars swirl animation exists');
assert(cssContent.includes('.burn-ember-container') && cssContent.includes('emberFlicker'), 'Burn ember flicker animation exists');
assert(cssContent.includes('.poison-bubble-container') && cssContent.includes('poisonPulse'), 'Poison purple bubble pulse animation exists');
assert(cssContent.includes('.paralysis-spark-container') && cssContent.includes('staticSpark'), 'Paralysis static spark animation exists');

// 3. Audit OHKO dramatic animation classes
console.log('\nChecking OHKO landing dramatic screen shake & flash overlay...');
assert(cssContent.includes('.ohko-shake') && cssContent.includes('ohkoShakeAnim'), 'OHKO screen shake animation exists');
assert(cssContent.includes('.ohko-flash-overlay') && cssContent.includes('ohkoFlash'), 'OHKO dramatic screen flash overlay exists');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

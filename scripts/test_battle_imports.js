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

console.log('--- RUNNING BATTLE IMPORT & SYMBOL AUDIT ---');

const battlePagePath = path.resolve('src/pages/Battle.jsx');
const battleContent = fs.readFileSync(battlePagePath, 'utf-8');

assert(battleContent.includes('getTypeEffectiveness'), 'getTypeEffectiveness imported and used in Battle.jsx');
assert(battleContent.includes('getMoveAccuracy'), 'getMoveAccuracy imported and used in Battle.jsx');
assert(battleContent.includes('isOhkoMove'), 'isOhkoMove imported and used in Battle.jsx');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

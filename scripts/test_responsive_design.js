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

console.log('--- RUNNING RESPONSIVE DESIGN MEDIA QUERY AUDIT ---');

const cssPath = path.resolve('src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// 1. Audit Media Queries
assert(cssContent.includes('@media (max-width: 768px)'), 'Tablet/Mobile (@media max-width 768px) query exists');
assert(cssContent.includes('@media (max-width: 480px)'), 'Small Mobile (@media max-width 480px) query exists');

// 2. Audit Mobile Component Breakpoints
assert(cssContent.includes('.nav-bar') && cssContent.includes('flex-direction: column'), 'Mobile Navbar wraps stacked vertically');
assert(cssContent.includes('.battle-arena') && cssContent.includes('height: auto'), 'Mobile Battle Arena height adapts dynamically');
assert(cssContent.includes('.move-btn-wrapper') && cssContent.includes('max-width: 48%'), 'Mobile Battle move controls wrap into grid');
assert(cssContent.includes('.collection-grid') && cssContent.includes('repeat(2, 1fr)'), 'Small Mobile Collection Grid switches to 2-column layout');
assert(cssContent.includes('.modal-body') && cssContent.includes('flex-direction: column'), 'Mobile Collection Modal switches to single column scroll');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

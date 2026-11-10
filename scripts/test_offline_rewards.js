/**
 * Offline arcade reward cache, local award, and pending-sync queue invariants.
 *
 * Run: node scripts/test_offline_rewards.js
 */
import {
  applyAwardToRows,
  readCollectionCache,
  upsertCachedEntry,
  upsertRowsEntry,
  writeCollectionCache,
} from '../src/store/collectionCache.js';
import {
  getPendingArcadeRewardCount,
  mergeQueuedAward,
  queueArcadeAward,
  readArcadeRewardQueue,
  removePendingArcadeAward,
  writeArcadeRewardQueue,
} from '../src/store/arcadeRewardQueueData.js';

let failures = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear(),
};

console.log('\n--- Local collection awards ---\n');

const first = applyAwardToRows([], 25);
assert(first.rows.length === 1, 'A new card is added to the local collection');
assert(first.drop.isNew === true, 'A new card is reported as new');
assert(first.target.baseKnown === false, 'A new card records an unknown server base');
assert(first.target.pulls === 1, 'A new card queues one pull');

const second = applyAwardToRows(first.rows, 25);
assert(second.drop.entry.star_level === 2, 'A duplicate raises the card to 2 stars');
assert(second.drop.entry.dupes_collected === 1, 'A duplicate increments dupes_collected');
assert(second.drop.starUpgraded === true, 'The duplicate reports a star upgrade');
assert(second.target.baseKnown === true, 'An existing cached card records a known base');

const maxedRows = [{ pokemon_id: 6, star_level: 19, dupes_collected: 18, is_shiny: false }];
const shiny = applyAwardToRows(maxedRows, 6);
assert(shiny.drop.entry.star_level === 20, 'The final duplicate reaches 20 stars');
assert(shiny.drop.becameShiny === true, '20 stars unlocks shiny');
assert(shiny.drop.entry.is_shiny === true, 'The shiny flag is stored locally');

const blocked = applyAwardToRows(shiny.rows, 6);
assert(blocked.drop.maxedOut === true, 'A maxed card blocks further star progress');
assert(blocked.drop.entry.dupes_collected === 19, 'A maxed card never exceeds 19 dupes');

const withPower = applyAwardToRows(
  [{ pokemon_id: 25, star_level: 1, dupes_collected: 0, is_power_card: true }],
  25
);
assert(withPower.rows.length === 2, 'A normal award is independent from a Power Card row');
assert(withPower.rows.some((row) => row.is_power_card), 'The Power Card row is preserved');

console.log('\n--- Per-user collection cache ---\n');

writeCollectionCache('user-a', first.rows);
writeCollectionCache('user-b', []);
assert(readCollectionCache('user-a')?.length === 1, 'The cache is scoped to its user');
assert(readCollectionCache('user-b')?.length === 0, 'An empty cache is still a valid cache');
assert(readCollectionCache('missing') === null, 'An absent cache returns null');

upsertCachedEntry('user-a', second.drop.entry);
assert(readCollectionCache('user-a')[0].star_level === 2, 'Awarded entries update the cache');
assert(
  upsertRowsEntry(
    [{ pokemon_id: 7, is_power_card: true, star_level: 1 }],
    { pokemon_id: 7, star_level: 3, dupes_collected: 2 }
  ).length === 2,
  'Cached normal awards never overwrite special records'
);

console.log('\n--- Pending reward queue ---\n');

writeArcadeRewardQueue('user-a', []);
queueArcadeAward('user-a', first.target);
assert(getPendingArcadeRewardCount('user-a') === 1, 'A pending award is queued');

queueArcadeAward('user-a', second.target);
const queued = readArcadeRewardQueue('user-a');
assert(queued.length === 1, 'Repeat awards for one card collapse into one queue entry');
assert(queued[0].pulls === 2, 'Queued pulls accumulate');
assert(queued[0].starLevel === 2, 'The queue keeps the latest absolute star target');
assert(queued[0].baseKnown === false, 'Unknown-base pulls stay in delta mode');

const mergedKnown = mergeQueuedAward(
  { pokemonId: 1, starLevel: 2, dupesCollected: 1, isShiny: false, pulls: 1, baseKnown: true },
  { pokemonId: 1, starLevel: 3, dupesCollected: 2, isShiny: false, pulls: 1, baseKnown: true }
);
assert(mergedKnown.baseKnown === true, 'Known-base awards keep absolute-target mode');
assert(mergedKnown.starLevel === 3, 'Known-base awards take the higher star target');

removePendingArcadeAward('user-a', 25);
assert(getPendingArcadeRewardCount('user-a') === 0, 'Synced awards leave the queue');

if (failures > 0) {
  console.error(`\n${failures} offline reward test(s) failed.`);
  process.exit(1);
}

console.log('\nAll offline reward tests passed.');

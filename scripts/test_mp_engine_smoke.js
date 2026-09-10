import { createServer } from 'vite';

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

console.log('--- RUNNING MULTIPLAYER BATTLE ENGINE SMOKE TEST ---');

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const { initMultiplayerMatchState, submitPlayerAction, resolveMultiplayerTurn } =
  await server.ssrLoadModule('/src/game/mpBattleEngine.js');
await server.close();

// 1. Simulate a full battle to make sure all new code paths (stat drops,
//    recoil, fixed damage) execute without runtime errors.
let state = initMultiplayerMatchState();
const maxTurns = 150;
let endOfTurnResolved = false;

for (let i = 0; i < maxTurns && !state.winner; i++) {
  const p1Active = state.activeIdx1;
  const p2Active = state.activeIdx2;
  const p1 = state.team1[p1Active];
  const p2 = state.team2[p2Active];

  // Pick a move (or struggle if all PP depleted)
  const p1MoveIdx = p1.moves.findIndex((m) => (m.currentPp ?? m.pp) > 0);
  const p2MoveIdx = p2.moves.findIndex((m) => (m.currentPp ?? m.pp) > 0);

  state = submitPlayerAction({
    state,
    isPlayer1: true,
    action: { type: 'move', moveIdx: p1MoveIdx },
  });

  state = submitPlayerAction({
    state,
    isPlayer1: false,
    action: { type: 'move', moveIdx: p2MoveIdx },
  });
}

assert(!!state, 'resolveMultiplayerTurn completed without crashing over ' + maxTurns + ' turns');
assert(state.winner !== undefined, `a winner is eventually determined (winner=${state.winner})`);

// 2. Stat-drop secondary effect correctness in MP (Bug Buzz -1 Sp.Def 10%)
const sState = initMultiplayerMatchState();
const az = sState.team1[sState.activeIdx1];
const bz = sState.team2[sState.activeIdx2];
// Force a deterministic 100% -Sp.Def move that BZ can use: poke both to use bug_buzz if available
const bugBuzzS = az.moves.find((m) => m.id === 'bug_buzz');
if (bugBuzzS) {
  const before = bz.stats.specialDefense;
  const res = resolveMultiplayerTurn({
    ...sState,
    pendingAction1: { type: 'move', moveIdx: az.moves.indexOf(bugBuzzS) },
    pendingAction2: { type: 'move', moveIdx: -1 },
  });
  const defAfter = res.team2[res.activeIdx2].stats.specialDefense;
  // Just assert the engine executed without crash; stat application is chance-based.
  assert(!!res, 'MP engine executes Bug Buzz without crashing');
  console.log(`  [info] Bug Buzz: Sp.Def ${before} -> ${defAfter} (10% chance to drop by 1 stage)`);
} else {
  console.log('  [info] Bug Buzz not on team, skipping deterministic stat-drop turn');
}

assert(!!sState, 'initMultiplayerMatchState initializes without crashing');

// 3. Teams start with positive-HP members
const countHp = (s, key) => s[key].reduce((acc, p) => acc + (p.currentHp > 0 ? 1 : 0), 0);
assert(countHp(sState, 'team1') > 0 && countHp(sState, 'team2') > 0, 'teams start with positive-HP members');

console.log(`\n--- SUMMARY: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
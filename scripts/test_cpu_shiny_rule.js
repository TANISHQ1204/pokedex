/**
 * Regression tests for the CPU-battle shiny rule (collection-gated) vs the
 * PvP / friend-battle shiny rule (pure random, unchanged).
 *
 * Run: node scripts/test_cpu_shiny_rule.js
 */
import {
  generateRandomTeam,
  SHINY_BATTLE_CHANCE,
  CPU_SHINY_OWNED_CHANCE,
  applyShinyStatBoost,
} from '../src/game/battle.js';
import pokemonList from '../src/data/pokemon.json' with { type: 'json' };

let failures = 0;
function assert(cond, label) {
  if (cond) {
    console.log(`[PASS] ${label}`);
  } else {
    failures += 1;
    console.error(`[FAIL] ${label}`);
  }
}

const id = (p) => Number(p.id);
const ownedId = id(pokemonList[0]); // e.g. Bulbasaur
const unownedId = id(pokemonList[1]); // Ivysaur

// --- Test 1: Empty owned set -> NEVER shiny (any team size, player's side) ---
{
  const options = { ownedShinyIds: new Set() };
  let shiny = 0;
  for (let t = 0; t < 40; t++) {
    const team = generateRandomTeam(pokemonList, 24, options);
    shiny += team.filter((m) => m.isShiny).length;
  }
  assert(shiny === 0, 'Empty owned-shiny set yields ZERO shiny slots in CPU battles');
}

// --- Test 2: Owned species CAN appear shiny; unowned NEVER does ---
{
  const miniList = [pokemonList[0], pokemonList[1]]; // owned + unowned
  const options = { ownedShinyIds: new Set([ownedId]) };
  const seenOwnedShiny = {};
  let unownedShinySeen = false;
  for (let t = 0; t < 200; t++) {
    const team = generateRandomTeam(miniList, 2, options);
    team.forEach((m) => {
      if (!m.isShiny) return;
      if (id(m) === ownedId) seenOwnedShiny[id(m)] = true;
      else if (id(m) !== ownedId) unownedShinySeen = true;
    });
  }
  assert(Object.keys(seenOwnedShiny).length === 1, 'Owned shiny species appeared as shiny in CPU battles');
  assert(unownedShinySeen === false, 'Unowned species NEVER appeared shiny in CPU battles');
}

// --- Test 3: Owned shiny rate is ~50% (within tolerance) ---
{
  const options = { ownedShinyIds: new Set([ownedId]) };
  const miniList = [pokemonList[0]]; // single owned species so every slot is it
  const total = 2000;
  let ownedTotalCount = 0;
  let ownedShinyCount = 0;
  for (let t = 0; t < total; t++) {
    const team = generateRandomTeam(miniList, 1, options);
    team.forEach((m) => {
      if (id(m) === ownedId) {
        ownedTotalCount += 1;
        if (m.isShiny) ownedShinyCount += 1;
      }
    });
  }
  const rate = ownedTotalCount > 0 ? ownedShinyCount / ownedTotalCount : 0;
  const expected = CPU_SHINY_OWNED_CHANCE;
  console.log(`  [info] owned shiny appearance rate ~${(rate * 100).toFixed(1)}% (expected ~${(expected * 100).toFixed(0)}%)`);
  assert(Math.abs(rate - expected) < 0.03, `Owned shiny rate ~${(rate * 100).toFixed(1)}% falls within tolerance of ${(expected * 100).toFixed(0)}%`);
}

// --- Test 4: No options (PvP path) stays pure random ~2.5%, independent of collection ---
{
  const total = 4000;
  let shinyCount = 0;
  for (let t = 0; t < total; t++) {
    const team = generateRandomTeam(pokemonList, 6);
    shinyCount += team.filter((m) => m.isShiny).length;
  }
  const rate = (shinyCount / (total * 6)).toFixed(3);
  console.log(`  [info] PvP pure-random shiny rate ~${(Number(rate) * 100).toFixed(1)}% (expected ~${(SHINY_BATTLE_CHANCE * 100).toFixed(1)}%)`);
  assert(Math.abs(Number(rate) - SHINY_BATTLE_CHANCE) < 0.012, 'PvP pure-random shiny roll unchanged (~2.5%)');
}

// --- Test 5: 12% stat boost still applies to shiny slots ---
{
  const boosted = applyShinyStatBoost(pokemonList[0].stats);
  assert(boosted.hp === Math.max(1, Math.round(pokemonList[0].stats.hp * 1.12)), 'Shiny stat boost (+12%) still applies');
}

console.log(failures === 0 ? '\n--- SUMMARY: all CPU shiny rule tests passed ---' : `\n--- SUMMARY: ${failures} FAILED ---`);
process.exit(failures === 0 ? 0 : 1);
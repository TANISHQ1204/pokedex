import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBadgeStatus } from '../src/game/badges.js';
import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const badgesPath = path.join(__dirname, '../src/data/badges.json');
const loreBadgesPath = path.join(__dirname, '../src/data/loreBadges.json');
const badges = JSON.parse(fs.readFileSync(badgesPath, 'utf-8'));
const loreBadges = JSON.parse(fs.readFileSync(loreBadgesPath, 'utf-8'));

console.log('--- Testing Badge System Logic (20-star) ---');
console.log('Total loaded badges:', badges.length + loreBadges.length);

let failures = 0;
function check(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

const kantoBadge = badges.find((b) => b.id === 'badge_kanto');
const boulderBadge = badges.find((b) => b.id === 'badge_boulder');

const empty = getBadgeStatus(kantoBadge, []);
check(!empty.isUnlocked, 'Empty collection leaves set badge locked');

const partialBoulderCollection = boulderBadge.pokemonIds.slice(0, 8).map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const partial = getBadgeStatus(boulderBadge, partialBoulderCollection);
check(!partial.isUnlocked, 'Partial badge set remains locked');

const fullBoulderCollection = boulderBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const full = getBadgeStatus(boulderBadge, fullBoulderCollection);
check(!full.isUnlocked, 'Complete gym set at 1-star stays locked');
check(full.requirement === 'mastery', 'Gym badge now requires mastery');

const fullBoulderMastered = boulderBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: MAX_STAR_LEVEL,
}));
const fullMastery = getBadgeStatus(boulderBadge, fullBoulderMastered);
check(fullMastery.isUnlocked, 'Complete gym set at 20-stars unlocks');
check(
  fullMastery.masteredCount === fullMastery.totalCount,
  'Every mastered gym member is counted'
);

const fullKantoCollection = kantoBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const regionalChampion = getBadgeStatus(kantoBadge, fullKantoCollection);
check(regionalChampion.isUnlocked, 'Regional Champion badge still unlocks on full ownership');
check(regionalChampion.requirement === 'ownership', 'Regional Champion badge stays ownership-based');

const loreChampionBadge = loreBadges.find((b) => b.family === 'champion');
check(Boolean(loreChampionBadge), 'Champion-family lore badge exists');

const ownedLoreChampion = loreChampionBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const loreChampionAtOneStar = getBadgeStatus(loreChampionBadge, ownedLoreChampion);
check(!loreChampionAtOneStar.isUnlocked, 'Champion-family badge stays locked at 1-star ownership');
check(loreChampionAtOneStar.requirement === 'mastery', 'Champion-family badge requires mastery');

const masteredLoreChampion = loreChampionBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: MAX_STAR_LEVEL,
}));
const loreChampionMastered = getBadgeStatus(loreChampionBadge, masteredLoreChampion);
check(loreChampionMastered.isUnlocked, 'Champion-family badge unlocks at full 20-star mastery');

const ownedMilestone = loreBadges.find((b) => b.criteria === 'ownedCount');
check(Boolean(ownedMilestone), 'Milestone badge exists');
const milestoneCollection = Array.from({ length: ownedMilestone.threshold }, (_, index) => ({
  pokemon_id: index + 1,
  star_level: 1,
}));
const milestoneStatus = getBadgeStatus(ownedMilestone, milestoneCollection);
check(milestoneStatus.isUnlocked, 'Milestone badge still unlocks at its ownership threshold');
check(milestoneStatus.requirement === 'milestone', 'Milestone badge stays threshold-based');

const kantoMasteryBadge = badges.find((b) => b.id === 'badge_master_kanto');
check(Boolean(kantoMasteryBadge), 'Star-mastery Kanto badge exists');
check(kantoMasteryBadge?.criteria === 'star20', 'Mastery badge uses star20 criteria');

const ownedStar1Collection = kantoMasteryBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: 1,
}));
const star1 = getBadgeStatus(kantoMasteryBadge, ownedStar1Collection);
check(!star1.isUnlocked, 'Owned at 1★ does not unlock mastery badge');

const halfMastered = kantoMasteryBadge.pokemonIds.map((id, idx) => ({
  pokemon_id: id,
  star_level: idx % 2 === 0 ? MAX_STAR_LEVEL : 1,
}));
const half = getBadgeStatus(kantoMasteryBadge, halfMastered);
check(!half.isUnlocked, 'Partial 20★ mastery remains locked');

const allMastered = kantoMasteryBadge.pokemonIds.map((id) => ({
  pokemon_id: id,
  star_level: MAX_STAR_LEVEL,
}));
const mastered = getBadgeStatus(kantoMasteryBadge, allMastered);
check(mastered.isUnlocked, 'All cards at 20★ unlock mastery badge');
check(mastered.masteredCount === mastered.totalCount, 'Every mastery member is counted');

const shinyMasterBadge = badges.find((b) => b.id === 'badge_shiny_master');
console.log('Shiny Master Badge covers', shinyMasterBadge?.pokemonIds.length ?? 0, 'species across all regions.');

if (failures === 0) {
  console.log('\nALL BADGE TESTS PASSED');
} else {
  console.error(`\n${failures} BADGE TEST(S) FAILED`);
  process.exit(1);
}

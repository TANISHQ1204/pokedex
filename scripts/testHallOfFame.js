import { MAX_STAR_LEVEL } from '../src/game/cardLevels.js';
import {
  buildHallOfFame,
  buildHonorsIndex,
  getInducteeEpithet,
  isHallInductee,
} from '../src/game/hallOfFame.js';
import { getPokemonById } from '../src/utils/pokemonCatalog.js';

console.log('--- Testing Hall of Fame Logic ---');

let failures = 0;
function check(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

const bulbasaur = getPokemonById(1);
const pikachu = getPokemonById(25);
const deoxysAttack = getPokemonById(10001);

const collection = [
  { pokemon_id: 1, star_level: MAX_STAR_LEVEL, updated_at: '2025-01-01T00:00:00.000Z' },
  { pokemon_id: 25, star_level: MAX_STAR_LEVEL, updated_at: '2026-01-01T00:00:00.000Z' },
  { pokemon_id: 10001, star_level: MAX_STAR_LEVEL, updated_at: '2027-01-01T00:00:00.000Z' },
  { pokemon_id: 6, star_level: MAX_STAR_LEVEL - 1, updated_at: '2027-02-01T00:00:00.000Z' },
];

check(isHallInductee({ star_level: MAX_STAR_LEVEL }), '20-star card is eligible');
check(!isHallInductee({ star_level: MAX_STAR_LEVEL - 1 }), '19-star card is not eligible');

const hall = buildHallOfFame({ collection });

check(hall.inductedCount === 3, 'Only eligible normal cards are inducted');
check(hall.catalogCount === 1256, 'Catalog includes species and alternate forms');
check(hall.newest?.id === 10001, 'Newest induction is ordered first');

const bulbasaurEntry = hall.inductees.find((entry) => entry.id === 1);
const pikachuEntry = hall.inductees.find((entry) => entry.id === 25);
const formEntry = hall.inductees.find((entry) => entry.id === 10001);

check(Boolean(bulbasaurEntry && pikachuEntry && formEntry), 'Species and alternate forms are all present');
check(bulbasaurEntry?.inductionNumber === 1, 'Oldest induction receives induction number 1');
check(pikachuEntry?.inductionNumber === 2, 'Induction numbers follow chronological order');
check(formEntry?.inductionNumber === 3, 'Alternate form receives an induction number');
check(formEntry?.isForm === true, 'Alternate form is marked as a form');
check(formEntry?.region === 'Hoenn', 'Form identity inherits the correct generation region');
check(bulbasaurEntry?.honors.length > 0, 'Inductee receives collection honors');
check(bulbasaurEntry?.topHonors.length <= 3, 'Plaque honors are capped at three');
check(Boolean(bulbasaurEntry?.epithet), 'Inductee receives an epithet');

const firstEpithet = getInducteeEpithet(bulbasaur, bulbasaurEntry?.honors || []);
const secondEpithet = getInducteeEpithet(bulbasaur, bulbasaurEntry?.honors || []);
check(firstEpithet === secondEpithet, 'Epithets are deterministic');
check(firstEpithet === bulbasaurEntry?.epithet, 'Built inductee uses the deterministic epithet');

const honorsIndex = buildHonorsIndex();
check(honorsIndex.get(1)?.length > 0, 'Honors index resolves Bulbasaur collections');
check(formEntry?.honors.length > 0, 'Alternate forms inherit species honors');

if (failures === 0) {
  console.log('\nALL HALL OF FAME TESTS PASSED');
} else {
  console.error(`\n${failures} HALL OF FAME TEST(S) FAILED`);
  process.exit(1);
}

export const ARCADE_GAMES = [
  {
    id: 'link-lab',
    name: 'Link Lab',
    eyebrow: 'Evolution Chain',
    tagline: 'Rebuild evolution lines before the timer collapses.',
    description: 'Connect each Pokemon to the right evolution family. Clean chains score bonus pulls.',
    accent: '#38bdf8',
    accent2: '#a78bfa',
    duration: '90 sec',
    difficulty: 'Warm-up',
    reward: '1-3 cards',
    status: 'Playable now',
    playable: true,
    controls: 'Tap, click, or keys 1-4',
    rounds: 8,
    timeLimit: 90,
    rules: [
      'Read the evolution line and find the missing stage.',
      'Pick one of four candidates before the timer runs out.',
      'Correct links build a streak and raise your score.',
      'Score 55% or more for two cards, 85% or more for three.',
    ],
  },
  {
    id: 'type-weaver',
    name: 'Type Weaver',
    eyebrow: 'Type Matrix',
    tagline: 'Weave the strongest answer from the type chart.',
    description: 'Read the matchup, choose the winning type, and build a streak before the board resets.',
    accent: '#34d399',
    accent2: '#22d3ee',
    duration: '75 sec',
    difficulty: 'Tactical',
    reward: '1-3 cards',
    status: 'Playable now',
    playable: true,
    controls: 'Tap, click, or keys 1-4',
    rounds: 8,
    timeLimit: 75,
    rules: [
      'Study the defender and its typing.',
      'Choose the attack type with the strongest multiplier.',
      'Correct answers build a streak and raise your score.',
      'Score 55% or more for two cards, 85% or more for three.',
    ],
  },
  {
    id: 'catch-rush',
    name: 'Catch Rush',
    eyebrow: 'Reaction Run',
    tagline: 'Spot the target and catch it before it escapes.',
    description: 'A fast target hunt through a shifting field of Pokemon. Find the match before the clock drains.',
    accent: '#fb923c',
    accent2: '#fbbf24',
    duration: '60 sec',
    difficulty: 'Fast',
    reward: '1-3 cards',
    status: 'Playable now',
    playable: true,
    controls: 'Tap, click, or keys 1-9',
    rounds: 10,
    timeLimit: 60,
    rules: [
      'Read the target in the spotlight.',
      'Find and catch the matching Pokemon in the field.',
      'Correct catches build a streak and raise your score.',
      'Score 55% or more for two cards, 85% or more for three.',
    ],
  },
  {
    id: 'memory-dex',
    name: 'Memory Dex',
    eyebrow: 'Card Recall',
    tagline: 'Match the pairs hiding in the Pokedex grid.',
    description: 'Flip cards, remember positions, and clear every pair before the timer closes the Dex.',
    accent: '#c084fc',
    accent2: '#f472b6',
    duration: '90 sec',
    difficulty: 'Focus',
    reward: '1-3 cards',
    status: 'Playable now',
    playable: true,
    controls: 'Tap, click, or keys 1-9 and 0',
    rounds: 5,
    timeLimit: 90,
    rules: [
      'Flip two cards at a time to find matching Pokemon.',
      'Matched pairs stay face up and build your streak.',
      'A missed pair resets the streak and costs a move.',
      'Score 55% or more for two cards, 85% or more for three.',
    ],
  },
];

export const ARCADE_GAME_BY_ID = Object.fromEntries(
  ARCADE_GAMES.map((game) => [game.id, game])
);

export function getArcadeGame(gameId) {
  return ARCADE_GAME_BY_ID[gameId] || null;
}

export function getDailyArcadeGame(date = new Date()) {
  const dayNumber = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  );
  return ARCADE_GAMES[((dayNumber % ARCADE_GAMES.length) + ARCADE_GAMES.length) % ARCADE_GAMES.length];
}

export function getQuickPlayGames(date = new Date()) {
  const daily = getDailyArcadeGame(date);
  return ARCADE_GAMES.filter((game) => game.id !== daily.id);
}

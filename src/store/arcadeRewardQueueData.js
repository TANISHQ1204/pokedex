const QUEUE_PREFIX = 'pokedex_arcade_reward_queue_v1';

function queueKey(userId) {
  return `${QUEUE_PREFIX}_${userId || 'preview'}`;
}

export function readArcadeRewardQueue(userId) {
  if (!userId) return [];

  try {
    const raw = localStorage.getItem(queueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function writeArcadeRewardQueue(userId, awards) {
  if (!userId) return [];

  const next = Array.isArray(awards) ? awards : [];
  try {
    localStorage.setItem(queueKey(userId), JSON.stringify(next));
  } catch (_) {
    /* quota exceeded or private mode */
  }
  return next;
}

export function getPendingArcadeRewardCount(userId) {
  return readArcadeRewardQueue(userId).length;
}

export function mergeQueuedAward(previous, award) {
  if (!previous) {
    return {
      ...award,
      pokemonId: Number(award.pokemonId),
      starLevel: Math.max(1, Number(award.starLevel) || 1),
      dupesCollected: Math.max(0, Number(award.dupesCollected) || 0),
      isShiny: Boolean(award.isShiny),
      pulls: Math.max(1, Number(award.pulls) || 1),
      baseKnown: Boolean(award.baseKnown),
    };
  }

  return {
    ...award,
    pokemonId: Number(award.pokemonId),
    starLevel: Math.max(Number(previous.starLevel) || 1, Number(award.starLevel) || 1),
    dupesCollected: Math.max(
      Number(previous.dupesCollected) || 0,
      Number(award.dupesCollected) || 0
    ),
    isShiny: Boolean(previous.isShiny) || Boolean(award.isShiny),
    pulls: Math.max(1, Number(previous.pulls) || 1) + Math.max(1, Number(award.pulls) || 1),
    baseKnown: Boolean(previous.baseKnown) && Boolean(award.baseKnown),
  };
}

export function queueArcadeAward(userId, award) {
  if (!userId || !award || award.pokemonId == null) {
    return readArcadeRewardQueue(userId);
  }

  const awards = readArcadeRewardQueue(userId);
  const index = awards.findIndex(
    (entry) => Number(entry?.pokemonId) === Number(award.pokemonId)
  );

  if (index >= 0) awards[index] = mergeQueuedAward(awards[index], award);
  else awards.push(mergeQueuedAward(null, award));

  return writeArcadeRewardQueue(userId, awards);
}

export function removePendingArcadeAward(userId, pokemonId) {
  if (!userId) return [];

  const next = readArcadeRewardQueue(userId).filter(
    (entry) => Number(entry?.pokemonId) !== Number(pokemonId)
  );
  return writeArcadeRewardQueue(userId, next);
}

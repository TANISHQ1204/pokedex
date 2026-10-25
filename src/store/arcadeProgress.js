import { getDailyArcadeGame } from '../game/arcadeGames.js';

const ARCADE_PROGRESS_KEY = 'pokedex_arcade_progress_v1';

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayNumberFromKey(dayKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''));
  if (!match) return null;
  const value = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000;
  return Number.isFinite(value) ? value : null;
}

export function advanceDailyStreak(streak, date = new Date()) {
  const today = utcDayKey(date);
  const source = streak && typeof streak === 'object' ? streak : {};
  const current = numberOrZero(source.current);
  const best = Math.max(numberOrZero(source.best), current);
  const lastDay = typeof source.lastDay === 'string' ? source.lastDay : null;

  if (lastDay === today) {
    return { current: Math.max(1, current), best: Math.max(best, 1), lastDay: today };
  }

  const todayNumber = dayNumberFromKey(today);
  const lastNumber = dayNumberFromKey(lastDay);
  const continued = todayNumber != null && lastNumber != null && todayNumber - lastNumber === 1;
  const nextCurrent = continued ? current + 1 : 1;

  return {
    current: nextCurrent,
    best: Math.max(best, nextCurrent),
    lastDay: today,
  };
}

function storageKey(userId) {
  return `${ARCADE_PROGRESS_KEY}_${userId || 'preview'}`;
}

function numberOrZero(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function normalizeGameStats(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    runs: numberOrZero(source.runs),
    bestScore: numberOrZero(source.bestScore),
    lastScore: numberOrZero(source.lastScore),
    bestCorrect: numberOrZero(source.bestCorrect),
    bestAccuracy: Math.max(0, Math.min(1, Number(source.bestAccuracy) || 0)),
    bestStreak: numberOrZero(source.bestStreak),
    lastPlayedAt: source.lastPlayedAt || null,
  };
}

export function normalizeArcadeProgress(raw, date = new Date()) {
  const day = utcDayKey(date);
  const featuredGame = getDailyArcadeGame(date);
  const source = raw && typeof raw === 'object' ? raw : {};
  const sourceGames = source.games && typeof source.games === 'object' ? source.games : {};
  const games = {};

  Object.entries(sourceGames).forEach(([gameId, stats]) => {
    games[gameId] = normalizeGameStats(stats);
  });

  const previousDaily = source.daily && typeof source.daily === 'object' ? source.daily : {};
  const dailyIsCurrent = previousDaily.day === day;
  const daily = {
    day,
    featuredGameId: featuredGame.id,
    runs: dailyIsCurrent ? numberOrZero(previousDaily.runs) : 0,
    bestScore: dailyIsCurrent ? numberOrZero(previousDaily.bestScore) : 0,
    rewardCards: dailyIsCurrent ? numberOrZero(previousDaily.rewardCards) : 0,
  };

  const previousStreak = source.streak && typeof source.streak === 'object' ? source.streak : {};
  const streakLastDay = typeof previousStreak.lastDay === 'string' ? previousStreak.lastDay : null;
  const streakTodayNumber = dayNumberFromKey(day);
  const streakLastNumber = dayNumberFromKey(streakLastDay);
  const streakGap = streakTodayNumber != null && streakLastNumber != null
    ? streakTodayNumber - streakLastNumber
    : null;
  const storedStreak = numberOrZero(previousStreak.current);
  const currentStreak = streakGap === 0 || streakGap === 1 ? storedStreak : 0;
  const streak = {
    current: currentStreak,
    best: Math.max(numberOrZero(previousStreak.best), currentStreak),
    lastDay: streakLastDay,
  };

  return {
    version: 2,
    games,
    daily,
    streak,
    totals: {
      runs: numberOrZero(source.totals?.runs),
      rewardCards: numberOrZero(source.totals?.rewardCards),
    },
    lastRun: source.lastRun && typeof source.lastRun === 'object' ? source.lastRun : null,
  };
}

export function loadArcadeProgress(userId, date = new Date()) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return normalizeArcadeProgress(raw ? JSON.parse(raw) : null, date);
  } catch {
    return normalizeArcadeProgress(null, date);
  }
}

export function saveArcadeProgress(userId, progress) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(progress));
  } catch {
    return false;
  }
  return true;
}

export function recordArcadeRun({
  userId,
  gameId,
  score = 0,
  maxScore = 1,
  correct = 0,
  rounds = 1,
  bestStreak = 0,
  rewardCards = 1,
  date = new Date(),
} = {}) {
  const progress = loadArcadeProgress(userId, date);
  const previous = normalizeGameStats(progress.games[gameId]);
  const safeMaxScore = Math.max(1, numberOrZero(maxScore));
  const safeRounds = Math.max(1, numberOrZero(rounds));
  const safeScore = Math.min(safeMaxScore, numberOrZero(score));
  const safeCorrect = Math.min(safeRounds, numberOrZero(correct));
  const safeBestStreak = Math.min(safeRounds, numberOrZero(bestStreak));
  const safeRewardCards = Math.max(0, Math.min(3, numberOrZero(rewardCards)));
  const accuracy = safeCorrect / safeRounds;
  const playedAt = date.toISOString();

  progress.games[gameId] = {
    runs: previous.runs + 1,
    bestScore: Math.max(previous.bestScore, safeScore),
    lastScore: safeScore,
    bestCorrect: Math.max(previous.bestCorrect, safeCorrect),
    bestAccuracy: Math.max(previous.bestAccuracy, accuracy),
    bestStreak: Math.max(previous.bestStreak, safeBestStreak),
    lastPlayedAt: playedAt,
  };

  if (progress.daily.featuredGameId === gameId) {
    progress.daily.runs += 1;
    progress.daily.bestScore = Math.max(progress.daily.bestScore, safeScore);
    progress.daily.rewardCards += safeRewardCards;
  }

  progress.streak = advanceDailyStreak(progress.streak, date);
  progress.totals.runs += 1;
  progress.totals.rewardCards += safeRewardCards;
  progress.lastRun = {
    gameId,
    score: safeScore,
    maxScore: safeMaxScore,
    correct: safeCorrect,
    rounds: safeRounds,
    bestStreak: safeBestStreak,
    rewardCards: safeRewardCards,
    playedAt,
  };

  saveArcadeProgress(userId, progress);
  return progress;
}

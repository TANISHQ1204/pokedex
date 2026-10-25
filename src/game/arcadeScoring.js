export const BASE_ANSWER_POINTS = 100;
export const STREAK_BONUS_POINTS = 20;
export const STREAK_BONUS_CAP = 5;

export function answerScore(streak = 0) {
  const safeStreak = Math.max(0, Math.floor(Number(streak) || 0));
  return BASE_ANSWER_POINTS + Math.min(STREAK_BONUS_CAP, safeStreak) * STREAK_BONUS_POINTS;
}

export function maxScoreForRounds(rounds = 8) {
  const safeRounds = Math.max(1, Math.floor(Number(rounds) || 0));
  let total = 0;
  for (let index = 0; index < safeRounds; index += 1) {
    total += answerScore(index);
  }
  return total;
}

export function rewardCardsForResult({ score = 0, maxScore = 1 } = {}) {
  const safeMax = Math.max(1, Number(maxScore) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(score) || 0) / safeMax));
  if (ratio >= 0.85) return 3;
  if (ratio >= 0.55) return 2;
  return 1;
}

export function gradeForResult({ score = 0, maxScore = 1 } = {}) {
  const safeMax = Math.max(1, Number(maxScore) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(score) || 0) / safeMax));
  if (ratio >= 0.95) return { letter: 'S', label: 'Flawless run' };
  if (ratio >= 0.8) return { letter: 'A', label: 'Clean execution' };
  if (ratio >= 0.6) return { letter: 'B', label: 'Solid run' };
  if (ratio >= 0.4) return { letter: 'C', label: 'Room to improve' };
  return { letter: 'D', label: 'Back to the lab' };
}

export function buildArcadeResult({
  score = 0,
  maxScore = 1,
  correct = 0,
  rounds = 1,
  bestStreak = 0,
} = {}) {
  const safeRounds = Math.max(1, Math.floor(Number(rounds) || 0));
  const safeCorrect = Math.max(0, Math.min(safeRounds, Math.floor(Number(correct) || 0)));
  const safeMaxScore = Math.max(1, Math.floor(Number(maxScore) || 0));
  const safeScore = Math.max(0, Math.min(safeMaxScore, Math.floor(Number(score) || 0)));
  return {
    score: safeScore,
    maxScore: safeMaxScore,
    correct: safeCorrect,
    rounds: safeRounds,
    accuracy: safeCorrect / safeRounds,
    bestStreak: Math.max(0, Math.min(safeRounds, Math.floor(Number(bestStreak) || 0))),
    rewardCards: rewardCardsForResult({ score: safeScore, maxScore: safeMaxScore }),
    grade: gradeForResult({ score: safeScore, maxScore: safeMaxScore }),
  };
}

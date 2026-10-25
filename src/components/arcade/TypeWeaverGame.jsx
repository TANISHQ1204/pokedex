import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PokemonImage from '../PokemonImage';
import { displayName } from '../../utils/pokemonCatalog.js';
import { answerScore, buildArcadeResult } from '../../game/arcadeScoring.js';
import {
  TYPE_WEAVER_TIME_LIMIT,
  buildTypeWeaverRun,
  effectivenessLabel,
  typeLabel,
} from '../../game/typeWeaver.js';
import useArcadeTimer from '../../hooks/useArcadeTimer.js';

function clockLabel(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export default function TypeWeaverGame({ onComplete }) {
  const run = useMemo(() => buildTypeWeaverRun(), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(false);

  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const roundIndexRef = useRef(0);
  const lockedRef = useRef(false);
  const finishedRef = useRef(false);
  const nextTimerRef = useRef(null);

  const finishRun = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    const result = buildArcadeResult({
      score: scoreRef.current,
      maxScore: run.maxScore,
      correct: correctRef.current,
      rounds: Math.max(1, answeredRef.current),
      bestStreak: bestStreakRef.current,
    });
    onComplete(result);
  }, [onComplete, run.maxScore]);

  const timeLeft = useArcadeTimer(TYPE_WEAVER_TIME_LIMIT, finishRun, !finished);
  const round = run.rounds[roundIndex] || null;

  useEffect(() => () => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
  }, []);

  const handleChoice = useCallback((option) => {
    if (!round || !option || lockedRef.current || finishedRef.current) return;
    lockedRef.current = true;
    setLocked(true);

    const isCorrect = option.multiplier === round.bestMultiplier;
    const earned = isCorrect ? answerScore(streakRef.current) : 0;
    answeredRef.current += 1;

    if (isCorrect) {
      correctRef.current += 1;
      scoreRef.current += earned;
      streakRef.current += 1;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      setScore(scoreRef.current);
      setStreak(streakRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }

    setFeedback({
      correct: isCorrect,
      earned,
      selectedType: option.type,
      selectedMultiplier: option.multiplier,
    });

    nextTimerRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      if (roundIndexRef.current >= run.rounds.length - 1) {
        finishRun();
        return;
      }
      roundIndexRef.current += 1;
      setRoundIndex(roundIndexRef.current);
      setFeedback(null);
      setLocked(false);
      lockedRef.current = false;
    }, 900);
  }, [finishRun, round, run.rounds.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const optionIndex = Number(event.key) - 1;
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) return;
      const option = round?.options[optionIndex];
      if (!option) return;
      event.preventDefault();
      handleChoice(option);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleChoice, round]);

  if (!round) return null;

  const timerPercent = Math.max(0, Math.min(100, (timeLeft / TYPE_WEAVER_TIME_LIMIT) * 100));

  return (
    <div className="arcade-game-panel type-weaver-panel">
      <div className="arcade-game-hud">
        <div>
          <span className="arcade-hud-label">Round</span>
          <strong>{roundIndex + 1} / {run.rounds.length}</strong>
        </div>
        <div>
          <span className="arcade-hud-label">Score</span>
          <strong>{score}</strong>
        </div>
        <div>
          <span className="arcade-hud-label">Streak</span>
          <strong>{streak}</strong>
        </div>
        <div className={`arcade-timer ${timeLeft <= 15 ? 'is-low' : ''}`}>
          <span className="arcade-hud-label">Time</span>
          <strong>{clockLabel(timeLeft)}</strong>
        </div>
      </div>

      <div className="arcade-timer-track" aria-hidden="true">
        <span style={{ width: `${timerPercent}%` }} />
      </div>

      <div className="type-defender">
        <div className="type-defender-aura" aria-hidden="true" />
        <PokemonImage pokemon={round.defender} alt={displayName(round.defender)} />
        <span className="arcade-hud-label">Defender</span>
        <h2>{round.defenderName}</h2>
        <div className="type-defender-types">
          {round.defender.types.map((type) => (
            <span key={type} className={`pokemon-type-badge type-${type}`}>{type}</span>
          ))}
        </div>
      </div>

      <div className="arcade-question">
        <span className="arcade-hud-label">Read the matrix</span>
        <h2>Which attack type hits hardest?</h2>
        <p>Tap a type or press 1-4. The best multiplier scores the link bonus.</p>
      </div>

      <div className="type-options" role="group" aria-label="Choose the strongest attack type">
        {round.options.map((option, index) => {
          const isCorrect = feedback && option.multiplier === round.bestMultiplier;
          const isWrong = feedback && !feedback.correct && option.type === feedback.selectedType;
          return (
            <button
              key={`${round.id}-${option.type}`}
              type="button"
              className={`type-option type-${option.type} ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
              onClick={() => handleChoice(option)}
              disabled={locked || finished}
              aria-keyshortcuts={String(index + 1)}
            >
              <span className="arcade-key-hint">{index + 1}</span>
              <strong>{typeLabel(option.type)}</strong>
              <small>{feedback ? effectivenessLabel(option.multiplier) : 'Weave this type'}</small>
            </button>
          );
        })}
      </div>

      <div className={`arcade-feedback ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} aria-live="polite">
        {feedback
          ? feedback.correct
            ? `${typeLabel(feedback.selectedType)} lands for ${effectivenessLabel(feedback.selectedMultiplier)}. +${feedback.earned} points.`
            : `${typeLabel(feedback.selectedType)} only lands for ${effectivenessLabel(feedback.selectedMultiplier)}. ${typeLabel(round.correctType)} was the best at ${effectivenessLabel(round.bestMultiplier)}.`
          : 'Choose the strongest attacking type.'}
      </div>
    </div>
  );
}

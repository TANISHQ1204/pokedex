import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PokemonImage from '../PokemonImage';
import { displayName } from '../../utils/pokemonCatalog.js';
import { answerScore, buildArcadeResult } from '../../game/arcadeScoring.js';
import { CATCH_RUSH_TIME_LIMIT, buildCatchRushRun } from '../../game/catchRush.js';
import useArcadeTimer from '../../hooks/useArcadeTimer.js';

function clockLabel(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export default function CatchRushGame({ onComplete }) {
  const run = useMemo(() => buildCatchRushRun(), []);
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
    onComplete(buildArcadeResult({
      score: scoreRef.current,
      maxScore: run.maxScore,
      correct: correctRef.current,
      rounds: Math.max(1, answeredRef.current),
      bestStreak: bestStreakRef.current,
    }));
  }, [onComplete, run.maxScore]);

  const timeLeft = useArcadeTimer(CATCH_RUSH_TIME_LIMIT, finishRun, !finished);
  const round = run.rounds[roundIndex] || null;

  useEffect(() => () => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
  }, []);

  const handleChoice = useCallback((pokemonId) => {
    if (!round || lockedRef.current || finishedRef.current) return;
    lockedRef.current = true;
    setLocked(true);

    const isCorrect = Number(pokemonId) === Number(round.target.id);
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
      selectedId: Number(pokemonId),
      targetId: Number(round.target.id),
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
    }, isCorrect ? 520 : 760);
  }, [finishRun, round, run.rounds.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      const optionIndex = Number(event.key) - 1;
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 8) return;
      const option = round?.options[optionIndex];
      if (!option) return;
      event.preventDefault();
      handleChoice(option.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleChoice, round]);

  if (!round) return null;

  const timerPercent = Math.max(0, Math.min(100, (timeLeft / CATCH_RUSH_TIME_LIMIT) * 100));

  return (
    <div className="arcade-game-panel catch-rush-panel">
      <div className="arcade-game-hud">
        <div>
          <span className="arcade-hud-label">Catch</span>
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
        <div className={`arcade-timer ${timeLeft <= 10 ? 'is-low' : ''}`}>
          <span className="arcade-hud-label">Time</span>
          <strong>{clockLabel(timeLeft)}</strong>
        </div>
      </div>

      <div className="arcade-timer-track" aria-hidden="true">
        <span style={{ width: `${timerPercent}%` }} />
      </div>

      <div className="catch-target" aria-label={`Target: ${round.targetName}`}>
        <span className="arcade-hud-label">Target spotted</span>
        <div className="catch-target-aura" aria-hidden="true" />
        <PokemonImage pokemon={round.target} alt={round.targetName} />
        <h2>{round.targetName}</h2>
        <div className="catch-target-types">
          {round.target.types.map((type) => (
            <span key={type} className={`pokemon-type-badge type-${type}`}>{type}</span>
          ))}
        </div>
      </div>

      <div className="arcade-question">
        <span className="arcade-hud-label">Catch the match</span>
        <h2>Find this Pokemon in the field</h2>
        <p>Tap the target or press 1-9. A wrong catch resets your streak.</p>
      </div>

      <div className="catch-field" role="group" aria-label="Catch the target Pokemon">
        {round.options.map((pokemon, index) => {
          const isTarget = feedback && pokemon.id === feedback.targetId;
          const isWrong = feedback && !feedback.correct && pokemon.id === feedback.selectedId;
          return (
            <button
              key={`${round.id}-${pokemon.id}`}
              type="button"
              className={`catch-tile ${isTarget ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
              onClick={() => handleChoice(pokemon.id)}
              disabled={locked || finished}
              aria-label={`Option ${index + 1}: ${displayName(pokemon)}`}
              aria-keyshortcuts={String(index + 1)}
            >
              <span className="arcade-key-hint">{index + 1}</span>
              <PokemonImage pokemon={pokemon} alt="" />
              <strong>{displayName(pokemon)}</strong>
            </button>
          );
        })}
      </div>

      <div className={`arcade-feedback ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} aria-live="polite">
        {feedback
          ? feedback.correct
            ? `Caught ${round.targetName}. +${feedback.earned} points.`
            : `Missed. That was not ${round.targetName}.`
          : 'Scan the field and make the catch.'}
      </div>
    </div>
  );
}

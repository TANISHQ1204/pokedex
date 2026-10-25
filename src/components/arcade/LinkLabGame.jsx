import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PokemonImage from '../PokemonImage';
import { displayName } from '../../utils/pokemonCatalog.js';
import { answerScore, buildArcadeResult } from '../../game/arcadeScoring.js';
import { LINK_LAB_TIME_LIMIT, buildLinkLabRun } from '../../game/linkLab.js';
import useArcadeTimer from '../../hooks/useArcadeTimer.js';

function clockLabel(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export default function LinkLabGame({ onComplete }) {
  const run = useMemo(() => buildLinkLabRun(), []);
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

  const timeLeft = useArcadeTimer(LINK_LAB_TIME_LIMIT, finishRun, !finished);

  const round = run.rounds[roundIndex] || null;

  useEffect(() => () => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
  }, []);

  const handleChoice = useCallback((pokemonId) => {
    if (!round || lockedRef.current || finishedRef.current) return;
    lockedRef.current = true;
    setLocked(true);

    const isCorrect = Number(pokemonId) === round.correctId;
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
      correctId: round.correctId,
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
    }, 850);
  }, [finishRun, round, run.rounds.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const optionIndex = Number(event.key) - 1;
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) return;
      const option = round?.options[optionIndex];
      if (!option) return;
      event.preventDefault();
      handleChoice(option.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleChoice, round]);

  if (!round) return null;

  const timerPercent = Math.max(0, Math.min(100, (timeLeft / LINK_LAB_TIME_LIMIT) * 100));

  return (
    <div className="arcade-game-panel">
      <div className="arcade-game-hud">
        <div>
          <span className="arcade-hud-label">Link</span>
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

      <div className="link-chain" aria-label="Evolution line">
        {round.family.map((pokemon, index) => {
          const isTarget = index === round.targetIndex;
          return (
            <React.Fragment key={`${round.id}-${pokemon.id}-${index}`}>
              <div className={`link-node ${isTarget ? 'is-target' : ''} ${index < round.targetIndex ? 'is-known' : ''}`}>
                {isTarget ? (
                  <div className="link-mystery">
                    <span>?</span>
                    <small>Missing link</small>
                  </div>
                ) : (
                  <>
                    <PokemonImage pokemon={pokemon} alt={displayName(pokemon)} />
                    <strong>{displayName(pokemon)}</strong>
                    <small>{index === 0 ? 'Base' : index === round.family.length - 1 ? 'Final' : 'Middle'}</small>
                  </>
                )}
              </div>
              {index < round.family.length - 1 && (
                <span className={`link-arrow ${index < round.targetIndex ? 'is-known' : ''}`} aria-hidden="true">â†’</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="arcade-question">
        <span className="arcade-hud-label">Repair the chain</span>
        <h2>Which Pokemon belongs in the missing slot?</h2>
        <p>Tap an answer or press 1-4. Streaks add bonus points.</p>
      </div>

      <div className="link-options" role="group" aria-label="Choose the missing Pokemon">
        {round.options.map((pokemon, index) => {
          const isCorrect = feedback && pokemon.id === feedback.correctId;
          const isWrong = feedback && !feedback.correct && pokemon.id === feedback.selectedId;
          return (
            <button
              key={`${round.id}-option-${pokemon.id}`}
              type="button"
              className={`link-option ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
              onClick={() => handleChoice(pokemon.id)}
              disabled={locked || finished}
              aria-keyshortcuts={String(index + 1)}
            >
              <span className="arcade-key-hint">{index + 1}</span>
              <PokemonImage pokemon={pokemon} alt={displayName(pokemon)} />
              <strong>{displayName(pokemon)}</strong>
            </button>
          );
        })}
      </div>

      <div className={`arcade-feedback ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} aria-live="polite">
        {feedback
          ? feedback.correct
            ? `Link secured. +${feedback.earned} points.`
            : `Wrong link. The answer was ${round.correctName}.`
          : 'Choose carefully. The chain is watching.'}
      </div>
    </div>
  );
}

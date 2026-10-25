import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PokemonImage from '../PokemonImage';
import { answerScore, buildArcadeResult } from '../../game/arcadeScoring.js';
import { MEMORY_DEX_TIME_LIMIT, buildMemoryDexRun } from '../../game/memoryDex.js';
import useArcadeTimer from '../../hooks/useArcadeTimer.js';

function clockLabel(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export default function MemoryDexGame({ onComplete }) {
  const run = useMemo(() => buildMemoryDexRun(), []);
  const [flipped, setFlipped] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(false);

  const scoreRef = useRef(0);
  const matchedRef = useRef(new Set());
  const movesRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const flippedRef = useRef([]);
  const lockedRef = useRef(false);
  const finishedRef = useRef(false);
  const flipTimerRef = useRef(null);

  const finishRun = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    onComplete(buildArcadeResult({
      score: scoreRef.current,
      maxScore: run.maxScore,
      correct: matchedRef.current.size,
      rounds: Math.max(1, run.pairs),
      bestStreak: bestStreakRef.current,
    }));
  }, [onComplete, run.maxScore, run.pairs]);

  const timeLeft = useArcadeTimer(MEMORY_DEX_TIME_LIMIT, finishRun, !finished);

  useEffect(() => () => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
  }, []);

  const handleCard = useCallback((index) => {
    if (lockedRef.current || finishedRef.current) return;
    const card = run.cards[index];
    if (!card || matchedRef.current.has(card.pairId) || flippedRef.current.includes(index)) return;

    if (flippedRef.current.length === 0) {
      flippedRef.current = [index];
      setFlipped([index]);
      setFeedback({ kind: 'flip', name: card.name });
      return;
    }

    const firstIndex = flippedRef.current[0];
    const firstCard = run.cards[firstIndex];
    const nextFlipped = [firstIndex, index];
    const nextMoves = movesRef.current + 1;
    lockedRef.current = true;
    setLocked(true);
    setFlipped(nextFlipped);
    flippedRef.current = nextFlipped;
    movesRef.current = nextMoves;
    setMoves(nextMoves);

    if (firstCard.pairId === card.pairId) {
      matchedRef.current.add(card.pairId);
      setMatchedPairs([...matchedRef.current]);
      const earned = answerScore(streakRef.current);
      scoreRef.current += earned;
      streakRef.current += 1;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setFeedback({ kind: 'match', name: card.name, earned });

      flipTimerRef.current = setTimeout(() => {
        if (finishedRef.current) return;
        if (matchedRef.current.size >= run.pairs) {
          finishRun();
          return;
        }
        flippedRef.current = [];
        setFlipped([]);
        setFeedback(null);
        setLocked(false);
        lockedRef.current = false;
      }, 520);
      return;
    }

    streakRef.current = 0;
    setStreak(0);
    setFeedback({ kind: 'miss', first: firstCard.name, second: card.name });

    flipTimerRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      flippedRef.current = [];
      setFlipped([]);
      setFeedback(null);
      setLocked(false);
      lockedRef.current = false;
    }, 800);
  }, [finishRun, run.cards, run.pairs]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      const rawIndex = event.key === '0' ? 9 : Number(event.key) - 1;
      if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex >= run.cards.length) return;
      event.preventDefault();
      handleCard(rawIndex);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCard, run.cards.length]);

  const matchedSet = new Set(matchedPairs);
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / MEMORY_DEX_TIME_LIMIT) * 100));

  return (
    <div className="arcade-game-panel memory-dex-panel">
      <div className="arcade-game-hud">
        <div>
          <span className="arcade-hud-label">Score</span>
          <strong>{score}</strong>
        </div>
        <div>
          <span className="arcade-hud-label">Pairs</span>
          <strong>{matchedPairs.length} / {run.pairs}</strong>
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

      <div className="arcade-question memory-question">
        <span className="arcade-hud-label">Memory Dex</span>
        <h2>Match every Pokemon pair</h2>
        <p>Flip two cards or press 1-9 and 0. Moves: {moves}. A missed pair resets the streak.</p>
      </div>

      <div className="memory-grid" role="group" aria-label="Memory Dex card grid">
        {run.cards.map((card, index) => {
          const isMatched = matchedSet.has(card.pairId);
          const isFaceUp = isMatched || flipped.includes(index);
          const keyHint = index === 9 ? 0 : index + 1;
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${isFaceUp ? 'is-face-up' : ''} ${isMatched ? 'is-matched' : ''}`}
              onClick={() => handleCard(index)}
              disabled={locked || finished || isMatched}
              aria-label={isFaceUp ? `${card.name}, face up` : `Card ${index + 1}, face down`}
              aria-keyshortcuts={String(keyHint)}
              aria-pressed={isFaceUp}
            >
              <span className="arcade-key-hint">{keyHint}</span>
              <span className="memory-card-inner">
                <span className="memory-face memory-back" aria-hidden="true">
                  <span>?</span>
                  <small>Memory</small>
                </span>
                <span className="memory-face memory-front">
                  <PokemonImage pokemon={card.pokemon} alt="" />
                  <strong>{card.name}</strong>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={`arcade-feedback ${feedback?.kind === 'match' ? 'is-correct' : feedback?.kind === 'miss' ? 'is-wrong' : ''}`} aria-live="polite">
        {feedback?.kind === 'match'
          ? `Pair matched: ${feedback.name}. +${feedback.earned} points.`
          : feedback?.kind === 'miss'
            ? `${feedback.first} and ${feedback.second} do not match. Streak reset.`
            : feedback?.kind === 'flip'
              ? `${feedback.name} is face up. Find its partner.`
              : 'Flip two cards and remember what you see.'}
      </div>
    </div>
  );
}

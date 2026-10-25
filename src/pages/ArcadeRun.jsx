import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { awardArcadeRunCards } from '../store/arcadeRewards';
import { loadArcadeProgress, recordArcadeRun } from '../store/arcadeProgress';
import { getArcadeGame, getDailyArcadeGame } from '../game/arcadeGames';
import { ArcadeGameIcon, CardsIcon, GamepadIcon, SwordsIcon } from '../components/icons/GameIcons';
import ArcadeRunShell from '../components/arcade/ArcadeRunShell';
import ArcadeRewardReveal from '../components/arcade/ArcadeRewardReveal';
import LinkLabGame from '../components/arcade/LinkLabGame';
import TypeWeaverGame from '../components/arcade/TypeWeaverGame';
import CatchRushGame from '../components/arcade/CatchRushGame';
import MemoryDexGame from '../components/arcade/MemoryDexGame';

function UnavailableRun({ title, message }) {
  return (
    <div className="page-container arcade-run-page">
      <div className="arcade-run-unavailable">
        <span className="arcade-run-unavailable-icon"><GamepadIcon size={38} /></span>
        <span className="home-eyebrow">Arcade floor</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link to="/arcade" className="home-cta primary">
          <GamepadIcon size={20} /> Back to arcade
        </Link>
      </div>
    </div>
  );
}

export default function ArcadeRun() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const game = getArcadeGame(gameId);
  const dailyGame = useMemo(() => getDailyArcadeGame(new Date()), []);
  const [phase, setPhase] = useState('intro');
  const [result, setResult] = useState(null);
  const [runKey, setRunKey] = useState(0);
  const [drops, setDrops] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [newBest, setNewBest] = useState(false);
  const [progress, setProgress] = useState(() => loadArcadeProgress(user?.id));

  useEffect(() => {
    setProgress(loadArcadeProgress(user?.id));
  }, [user?.id]);

  const isDaily = Boolean(game && dailyGame.id === game.id);
  const bestScore = game ? progress.games?.[game.id]?.bestScore || 0 : 0;

  const startRun = useCallback(() => {
    setResult(null);
    setDrops(null);
    setClaimed(false);
    setClaimError('');
    setNewBest(false);
    setRunKey((value) => value + 1);
    setPhase('playing');
  }, []);

  const handleComplete = useCallback((runResult) => {
    if (!game) return;
    const priorBest = progress.games?.[game.id]?.bestScore || 0;
    setResult(runResult);
    setDrops(null);
    setClaimed(false);
    setClaimError('');
    setNewBest(runResult.score > priorBest);
    setPhase('summary');
    const updated = recordArcadeRun({
      userId: user?.id,
      gameId: game.id,
      score: runResult.score,
      maxScore: runResult.maxScore,
      correct: runResult.correct,
      rounds: runResult.rounds,
      bestStreak: runResult.bestStreak,
      rewardCards: runResult.rewardCards,
    });
    setProgress(updated);
  }, [game, progress.games, user?.id]);

  const handleClaim = async () => {
    if (!result || claimed || claiming) return;
    setClaiming(true);
    setClaimError('');
    try {
      const awarded = await awardArcadeRunCards({
        userId: user?.id,
        cardCount: result.rewardCards,
      });
      setDrops(awarded);
    } catch (error) {
      console.error('Error claiming arcade rewards:', error);
      setClaimError('Rewards could not be saved. Check your connection and try again.');
    } finally {
      setClaiming(false);
    }
  };

  const finishReveal = () => {
    setDrops(null);
    setClaimed(true);
  };

  if (!game) {
    return (
      <UnavailableRun
        title="Run not found"
        message="That arcade cabinet is not on the floor. Pick another run from the lobby."
      />
    );
  }

  if (!game.playable) {
    return (
      <UnavailableRun
        title={`${game.name} is still warming up`}
        message={`${game.tagline} This cabinet opens in a later arcade drop.`}
      />
    );
  }

  const aside = (
    <div className="arcade-run-aside-stack">
      <section className="arcade-side-panel">
        <span className="home-eyebrow">How to play</span>
        <ol className="arcade-rule-list">
          {(game.rules || []).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>

      <section className="arcade-side-panel">
        <span className="home-eyebrow">Controls</span>
        <div className="arcade-side-row"><span>Input</span><strong>{game.controls}</strong></div>
        <div className="arcade-side-row"><span>Session</span><strong>{game.duration}</strong></div>
        <div className="arcade-side-row"><span>Difficulty</span><strong>{game.difficulty}</strong></div>
        <div className="arcade-side-row"><span>Best score</span><strong>{bestScore}</strong></div>
        <div className="arcade-side-row">
          <span>Daily streak</span>
          <strong>
            {progress.streak?.current || 0} {(progress.streak?.current || 0) === 1 ? 'day' : 'days'}
          </strong>
        </div>
      </section>

      <section className="arcade-side-panel">
        <span className="home-eyebrow">Run rewards</span>
        <div className="arcade-reward-mini">
          <CardsIcon size={22} />
          <div>
            <strong>1-3 normal cards</strong>
            <span>Clear rate sets the pull count. Duplicates still add stars.</span>
          </div>
        </div>
        {isDaily && (
          <div className="arcade-daily-note">
            <span className="home-status-dot" />
            Daily featured run. Best score is tracked for today.
          </div>
        )}
      </section>
    </div>
  );

  return (
    <>
      <ArcadeRunShell
        game={game}
        statusLabel={phase === 'playing' ? 'Run live' : phase === 'summary' ? 'Complete' : 'Ready'}
        bestScore={bestScore}
        isDaily={isDaily}
        aside={aside}
      >
        {phase === 'intro' && (
          <div className="arcade-run-intro">
            <div className="arcade-run-intro-glow" aria-hidden="true" />
            <span className="arcade-run-intro-icon">
              <ArcadeGameIcon gameId={game.id} size={54} />
            </span>
            <span className="home-eyebrow">{game.eyebrow}</span>
            <h2>{game.tagline}</h2>
            <p>{game.description}</p>
            <div className="home-feature-meta">
              <span>{game.duration}</span>
              <span>{game.difficulty}</span>
              <span>{game.reward}</span>
            </div>
            <div className="arcade-run-actions">
              <button type="button" className="home-cta primary" onClick={startRun}>
                <GamepadIcon size={20} /> Start run
              </button>
              <Link to="/arcade" className="home-cta secondary">
                <SwordsIcon size={20} /> Back to lobby
              </Link>
            </div>
            <p className="arcade-run-tip">
              Rewards use the same collection, duplicate, and star system as CPU Battle.
            </p>
          </div>
        )}

        {phase === 'playing' && game.id === 'link-lab' && (
          <LinkLabGame key={`link-${runKey}`} onComplete={handleComplete} />
        )}

        {phase === 'playing' && game.id === 'type-weaver' && (
          <TypeWeaverGame key={`type-${runKey}`} onComplete={handleComplete} />
        )}

        {phase === 'playing' && game.id === 'catch-rush' && (
          <CatchRushGame key={`catch-${runKey}`} onComplete={handleComplete} />
        )}

        {phase === 'playing' && game.id === 'memory-dex' && (
          <MemoryDexGame key={`memory-${runKey}`} onComplete={handleComplete} />
        )}

        {phase === 'summary' && result && (
          <div className="arcade-summary">
            <span className="home-eyebrow">Run complete</span>
            <div className={`arcade-grade grade-${result.grade.letter.toLowerCase()}`}>
              <strong>{result.grade.letter}</strong>
              <span>{result.grade.label}</span>
            </div>
            <h2>{result.grade.label}</h2>
            <p>
              {Math.round(result.accuracy * 100)}% accuracy - {result.correct} of {result.rounds} answered correctly. Best streak {result.bestStreak}.
            </p>

            <div className="arcade-summary-grid">
              <div><span>Score</span><strong>{result.score}</strong><small>of {result.maxScore}</small></div>
              <div><span>Best</span><strong>{bestScore}</strong><small>personal record</small></div>
              <div><span>Pull reward</span><strong>{result.rewardCards}</strong><small>normal cards</small></div>
            </div>

            {newBest && result.score > 0 && (
              <span className="arcade-new-best" role="status">New personal best</span>
            )}

            <div className="arcade-run-actions">
              {!claimed && (
                <button
                  type="button"
                  className="home-cta primary"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  <CardsIcon size={20} />
                  {claiming ? 'Opening rewards...' : `Claim ${result.rewardCards} card${result.rewardCards === 1 ? '' : 's'}`}
                </button>
              )}
              {claimed && (
                <span className="arcade-claimed">
                  <CardsIcon size={20} /> Rewards added to your collection
                </span>
              )}
              <button type="button" className="home-cta secondary" onClick={startRun}>
                <GamepadIcon size={20} /> Play again
              </button>
              <Link to="/arcade" className="home-text-link">
                Back to arcade <span aria-hidden="true">â†’</span>
              </Link>
            </div>

            {claimError && <div className="arcade-claim-error" role="alert">{claimError}</div>}
          </div>
        )}
      </ArcadeRunShell>

      {drops && (
        <ArcadeRewardReveal
          drops={drops}
          onComplete={finishReveal}
          onPlayAgain={() => {
            setClaimed(true);
            startRun();
          }}
        />
      )}
    </>
  );
}

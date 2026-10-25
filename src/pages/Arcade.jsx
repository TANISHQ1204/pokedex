import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ARCADE_GAMES, getArcadeGame, getDailyArcadeGame } from '../game/arcadeGames';
import { useAuth } from '../context/AuthContext';
import { loadArcadeProgress } from '../store/arcadeProgress';
import ArcadeGameCard from '../components/ArcadeGameCard';
import {
  ArcadeGameIcon,
  GamepadIcon,
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
} from '../components/icons/GameIcons';

export default function Arcade() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [progress, setProgress] = useState(() => loadArcadeProgress(user?.id));
  const dailyGame = useMemo(() => getDailyArcadeGame(new Date()), []);
  const selectedGame = getArcadeGame(searchParams.get('game')) || dailyGame;
  const dailyRuns = progress.daily?.featuredGameId === dailyGame.id ? progress.daily.runs : 0;
  const dailyBest = progress.daily?.featuredGameId === dailyGame.id ? progress.daily.bestScore : 0;
  const totalRuns = progress.totals?.runs || 0;
  const totalCards = progress.totals?.rewardCards || 0;
  const streakCurrent = progress.streak?.current || 0;
  const streakBest = progress.streak?.best || 0;

  useEffect(() => {
    setProgress(loadArcadeProgress(user?.id));
  }, [user?.id]);

  return (
    <div className="page-container home-page arcade-page">
      <section
        className="arcade-hero"
        style={{ '--game-accent': selectedGame.accent, '--game-accent-2': selectedGame.accent2 }}
      >
        <div className="arcade-hero-copy">
          <div className="home-hero-eyebrow">
            <GamepadIcon size={18} />
            <span>Poke Arcade</span>
            <span className="home-live-dot">Four cabinets live</span>
          </div>
          <h1>Four quick runs.<br />One shared card pool.</h1>
          <p className="home-hero-subtitle">
            Short, replayable challenges built around the collection you already own.
            Pick today&apos;s featured run or warm up with a mode you know.
          </p>
          <div className="home-hero-actions">
            <Link to="/battle" className="home-cta primary">
              <SwordsIcon size={20} /> Train in CPU Battle
            </Link>
            <Link to="/collection" className="home-cta secondary">
              <CardsIcon size={20} /> View Collection
            </Link>
          </div>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> Daily featured: {dailyGame.name}</span>
            <span>{dailyRuns} run{dailyRuns === 1 ? '' : 's'} today - Best {dailyBest}</span>
            <span>{streakCurrent} {streakCurrent === 1 ? 'day' : 'days'} streak</span>
          </div>
        </div>

        <div className="arcade-selected-card">
          <div className="arcade-selected-glow" aria-hidden="true" />
          <span className="home-eyebrow">Selected run</span>
          <div className="arcade-selected-icon">
            <ArcadeGameIcon gameId={selectedGame.id} size={48} />
          </div>
          <span className="arcade-game-eyebrow">{selectedGame.eyebrow}</span>
          <h2>{selectedGame.name}</h2>
          <p>{selectedGame.description}</p>
          <div className="home-feature-meta">
            <span>{selectedGame.duration}</span>
            <span>{selectedGame.difficulty}</span>
            <span>{selectedGame.reward}</span>
          </div>
          <div className="arcade-selected-status">
            <span className="home-status-dot" />
            {selectedGame.playable
              ? `Ready · ${selectedGame.controls}`
              : 'Cabinet opens in a later arcade drop'}
          </div>
          <div className="arcade-selected-actions">
            {selectedGame.playable ? (
              <Link to={`/arcade/play/${selectedGame.id}`} className="home-feature-cta">
                Play this run <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="arcade-selected-lock">Coming soon</span>
            )}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="arcade-floor-title">
        <div className="home-section-head">
          <div>
            <span className="home-eyebrow">Arcade floor</span>
            <h2 id="arcade-floor-title">Browse every run</h2>
            <p>Daily featured rotates at midnight UTC. Quick-play runs stay available year-round.</p>
          </div>
          <Link to={`/arcade?game=${dailyGame.id}`} className="home-text-link">
            Today&apos;s featured: {dailyGame.name}
          </Link>
        </div>

        <div className="arcade-quick-select" role="group" aria-label="Quick play selection">
          <span>Quick select</span>
          <div className="arcade-quick-select-list">
            {ARCADE_GAMES.map((game) => (
              <Link
                key={game.id}
                to={`/arcade?game=${game.id}`}
                className={`arcade-quick-chip ${game.id === selectedGame.id ? 'is-selected' : ''}`}
                aria-current={game.id === selectedGame.id ? 'true' : undefined}
              >
                <ArcadeGameIcon gameId={game.id} size={16} />
                {game.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="arcade-game-grid arcade-game-grid-all">
          {ARCADE_GAMES.map((game) => (
            <ArcadeGameCard
              key={game.id}
              game={game}
              ctaLabel={game.playable ? 'Play run' : 'Preview run'}
              highlighted={game.id === selectedGame.id}
            />
          ))}
        </div>
      </section>

      <section className="home-section arcade-record-section" aria-labelledby="arcade-record-title">
        <div className="home-section-head">
          <div>
            <span className="home-eyebrow">Arcade record</span>
            <h2 id="arcade-record-title">Your runs and best scores</h2>
            <p>Local progress updates after every run. Daily streaks follow UTC reset.</p>
          </div>
        </div>

        <div className="arcade-record-layout">
          <div className="arcade-record-summary">
            <div className="arcade-stat-card">
              <span>Total runs</span>
              <strong>{totalRuns}</strong>
              <small>all arcade modes</small>
            </div>
            <div className="arcade-stat-card">
              <span>Cards earned</span>
              <strong>{totalCards}</strong>
              <small>from run rewards</small>
            </div>
            <div className="arcade-stat-card">
              <span>Daily streak</span>
              <strong>{streakCurrent}</strong>
              <small>best {streakBest} days</small>
            </div>
          </div>

          <div className="arcade-record-games">
            {ARCADE_GAMES.map((game) => {
              const stats = progress.games?.[game.id] || {};
              return (
                <Link
                  key={game.id}
                  to={`/arcade/play/${game.id}`}
                  className="arcade-record-row"
                  style={{ '--game-accent': game.accent }}
                >
                  <span className="arcade-record-icon">
                    <ArcadeGameIcon gameId={game.id} size={18} />
                  </span>
                  <span className="arcade-record-copy">
                    <strong>{game.name}</strong>
                    <small>{stats.runs || 0} run{stats.runs === 1 ? '' : 's'} - best streak {stats.bestStreak || 0}</small>
                  </span>
                  <span className="arcade-record-score">
                    <small>Best score</small>
                    <strong>{stats.bestScore || 0}</strong>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="arcade-reward-strip" aria-label="Arcade rewards">
        <div className="arcade-reward-item">
          <CardsIcon size={22} />
          <div>
            <strong>1-3 cards per clear</strong>
            <span>Accuracy sets the reward count. Better runs pull more cards.</span>
          </div>
        </div>
        <div className="arcade-reward-item">
          <TrophyIcon size={22} tier="gold" />
          <div>
            <strong>Trophy progress</strong>
            <span>Duplicates still add stars toward your existing trophy sets.</span>
          </div>
        </div>
        <div className="arcade-reward-item">
          <GamepadIcon size={22} />
          <div>
            <strong>Quick sessions</strong>
            <span>Every run is designed to fit between battles.</span>
          </div>
        </div>
      </section>

      <div className="home-tool-grid arcade-utility-grid">
        <Link to="/battle" className="home-tool-card">
          <SwordsIcon size={22} />
          <span><strong>CPU Battle</strong><small>Keep your streak alive</small></span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/game-modes" className="home-tool-card">
          <GamepadIcon size={22} />
          <span><strong>Game Modes</strong><small>Explore the full league</small></span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/trophies" className="home-tool-card">
          <TrophyIcon size={22} tier="gold" />
          <span><strong>Trophy Hall</strong><small>Track collection tiers</small></span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ArcadeGameIcon } from '../icons/GameIcons';

export default function ArcadeRunShell({ game, statusLabel, bestScore, isDaily, children, aside }) {
  return (
    <div
      className="page-container arcade-run-page"
      style={{ '--game-accent': game.accent, '--game-accent-2': game.accent2 }}
    >
      <header className="arcade-run-topbar">
        <Link to="/arcade" className="arcade-run-back">
          <span aria-hidden="true">←</span> Arcade
        </Link>
        <div className="arcade-run-identity">
          <span className="arcade-run-icon">
            <ArcadeGameIcon gameId={game.id} size={30} />
          </span>
          <div>
            <span className="arcade-game-eyebrow">{game.eyebrow}</span>
            <h1>{game.name}</h1>
          </div>
        </div>
        <div className="arcade-run-meta">
          {isDaily && <span className="arcade-run-daily">Daily featured</span>}
          <span className="home-live-dot">{statusLabel}</span>
          <span>Best {bestScore || 0}</span>
        </div>
      </header>

      <div className="arcade-run-layout">
        <section className="arcade-run-main" aria-label={`${game.name} run`}>
          {children}
        </section>
        <aside className="arcade-run-aside">{aside}</aside>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ArcadeGameIcon } from './icons/GameIcons';

export default function ArcadeGameCard({
  game,
  ctaLabel,
  featured = false,
  highlighted = false,
}) {
  if (!game) return null;

  const label = ctaLabel || (game.playable ? 'Play run' : 'Preview run');

  return (
    <Link
      to={game.playable ? `/arcade/play/${game.id}` : `/arcade?game=${game.id}`}
      className={['arcade-game-card', featured && 'is-featured', highlighted && 'is-highlighted']
        .filter(Boolean)
        .join(' ')}
      aria-current={highlighted ? 'true' : undefined}
      style={{ '--game-accent': game.accent, '--game-accent-2': game.accent2 }}
    >
      <div className="arcade-game-card-top">
        <span className="arcade-game-icon">
          <ArcadeGameIcon gameId={game.id} size={26} />
        </span>
        <span className={`arcade-game-status ${game.playable ? 'is-live' : ''}`}>{game.status}</span>
      </div>
      <div className="arcade-game-copy">
        <span className="arcade-game-eyebrow">{game.eyebrow}</span>
        <h3>{game.name}</h3>
        <p>{game.tagline}</p>
      </div>
      <div className="arcade-game-meta">
        <span>{game.duration}</span>
        <span>{game.difficulty}</span>
        <span>{game.reward}</span>
      </div>
      <div className="arcade-game-footer">
        <span className="arcade-card-cta">
          {label} <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

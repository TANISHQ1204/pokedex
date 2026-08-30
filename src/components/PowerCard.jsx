import React, { useState, useRef } from 'react';
import './PowerCard.css';

const TYPE_COLORS = {
  normal: '#94a3b8',
  fire: '#f97316',
  water: '#0ea5e9',
  grass: '#22c55e',
  electric: '#eab308',
  ice: '#38bdf8',
  fighting: '#ef4444',
  poison: '#a855f7',
  ground: '#d97706',
  flying: '#818cf8',
  psychic: '#ec4899',
  bug: '#84cc16',
  rock: '#b45309',
  ghost: '#7e22ce',
  dragon: '#6366f1',
  dark: '#475569',
  steel: '#94a3b8',
  fairy: '#f472b6',
};

export default function PowerCard({
  pokemon,
  themeTypeOverride = null,
  enableTilt = true,
  onClick = null,
}) {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [sheenStyle, setSheenStyle] = useState({});

  if (!pokemon) return null;

  const primaryType = pokemon.types?.[0] || 'normal';
  const activeTheme = themeTypeOverride || primaryType;
  const accentColor = TYPE_COLORS[activeTheme] || '#94a3b8';
  const spriteUrl = pokemon.sprites?.normal;
  const signatureMove = pokemon.moves?.[0] || { name: 'Power Surge', power: 120, type: primaryType };

  const handleMouseMove = (e) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    const mouseXPercent = (x / rect.width) * 100;
    const mouseYPercent = (y / rect.height) * 100;

    setTiltStyle({
      transform: `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.03)`,
    });
    setSheenStyle({
      '--mouse-x': `${mouseXPercent.toFixed(1)}%`,
      '--mouse-y': `${mouseYPercent.toFixed(1)}%`,
    });
  };

  const handleMouseLeave = () => {
    if (!enableTilt) return;
    setTiltStyle({ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' });
  };

  return (
    <div className="power-card-stage" onClick={onClick}>
      <div
        ref={cardRef}
        className="power-card"
        data-glow
        style={{ ...tiltStyle, '--pc-energy': accentColor }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="power-card-canvas"
          style={{
            '--accent': accentColor,
            '--accent-glow': accentColor + '99',
            '--accent-dim': accentColor + '33',
            '--accent-faint': accentColor + '18',
          }}
        >
          {/* Subtle type-colored ambient glow */}
          <div className="pc-ambient-glow" />

          {/* Holographic sheen + foil lines */}
          <div className="pc-holo-sheen" style={sheenStyle} />
          <div className="pc-foil-lines" />

          {/* Fine edge accent border (inner) */}
          <div className="pc-inner-border" />

          {/* Header */}
          <div className="pc-header">
            <div className="pc-header-left">
              <span className="pc-badge">POWER</span>
              <span className="pc-name">{pokemon.name}</span>
            </div>
            <div className="pc-hp">
              <span className="pc-hp-label">HP</span>
              <span className="pc-hp-val">{pokemon.stats?.hp || 100}</span>
            </div>
          </div>

          {/* Artwork */}
          <div className="pc-art-area">
            <div className="pc-art-frame" />
            <img
              src={spriteUrl}
              alt={pokemon.name}
              className="pc-sprite"
            />
          </div>

          {/* Body */}
          <div className="pc-body">
            {/* Type pills */}
            <div className="pc-types-row">
              {pokemon.types?.map((t) => (
                <span
                  key={t}
                  className="pc-type-pill"
                  style={{ '--pill-color': TYPE_COLORS[t] || '#64748b' }}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Signature move */}
            <div className="pc-move-box">
              <span className="pc-move-name">{signatureMove.name}</span>
              <span className="pc-move-power">{signatureMove.power || '--'}</span>
            </div>

            {/* Stats */}
            <div className="pc-stats">
              {[
                { label: 'ATK', val: pokemon.stats?.attack },
                { label: 'DEF', val: pokemon.stats?.defense },
                { label: 'SPD', val: pokemon.stats?.speed },
              ].map((s) => (
                <div key={s.label} className="pc-stat">
                  <span className="pc-stat-label">{s.label}</span>
                  <span className="pc-stat-val">{s.val || 0}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pc-footer">
              <span>PROMO #PWR-{(pokemon.id || 1).toString().padStart(3, '0')}</span>
              <span className="pc-footer-rarity">ULTRA RARE</span>
            </div>
          </div>
        </div>
        <div className="pc-energy-focus" aria-hidden="true" />
      </div>
    </div>
  );
}

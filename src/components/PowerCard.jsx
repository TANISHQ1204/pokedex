import React, { useState, useRef } from 'react';
import './PowerCard.css';

// Type Color Palette mapping
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
  dark: '#334155',
  steel: '#64748b',
  fairy: '#f472b6',
  blended: '#e879f9',
};

export default function PowerCard({
  pokemon,
  isShiny = false,
  themeTypeOverride = null,
  enableTilt = true,
  onClick = null,
}) {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [sheenStyle, setSheenStyle] = useState({});

  if (!pokemon) return null;

  const primaryType = pokemon.types?.[0] || 'normal';
  const secondaryType = pokemon.types?.[1] || null;

  // Determine active theme (override like 'fire', 'flying', or 'blended', or default to primary type)
  const activeTheme = themeTypeOverride || primaryType;

  // Artwork sprite selection
  const spriteUrl = isShiny
    ? pokemon.sprites?.shiny || pokemon.sprites?.normal
    : pokemon.sprites?.normal;

  // Signature move (pick first high-power move or default)
  const signatureMove = pokemon.moves?.[0] || { name: 'Power Surge', power: 120, type: primaryType };

  // Handle 3D Mouse Tilt Interactivity
  const handleMouseMove = (e) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -16; // Up/down tilt
    const rotateY = ((x - centerX) / centerX) * 16;  // Left/right tilt

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
    setTiltStyle({
      transform: 'rotateX(0deg) rotateY(0deg) scale(1)',
    });
  };

  // Render Theme Particles
  const renderThemeParticles = () => {
    switch (activeTheme) {
      case 'fire':
        return (
          <>
            <div className="ember-particle" style={{ left: '15%', animationDelay: '0s' }} />
            <div className="ember-particle" style={{ left: '45%', animationDelay: '1.2s' }} />
            <div className="ember-particle" style={{ left: '75%', animationDelay: '0.6s' }} />
            <div className="ember-particle" style={{ left: '30%', animationDelay: '2.1s' }} />
          </>
        );
      case 'water':
        return (
          <>
            <div className="water-wave" />
            <div className="water-bubble" style={{ left: '20%', width: '12px', height: '12px', animationDelay: '0s' }} />
            <div className="water-bubble" style={{ left: '60%', width: '18px', height: '18px', animationDelay: '1.5s' }} />
            <div className="water-bubble" style={{ left: '80%', width: '10px', height: '10px', animationDelay: '2.8s' }} />
          </>
        );
      case 'electric':
        return (
          <>
            <div className="electric-spark" style={{ left: '20%', top: '10%' }} />
            <div className="electric-spark" style={{ left: '75%', top: '30%', animationDelay: '0.3s' }} />
            <div className="electric-spark" style={{ left: '40%', top: '60%', animationDelay: '0.15s' }} />
          </>
        );
      case 'grass':
        return (
          <>
            <div className="leaf-spore" style={{ left: '20%', animationDelay: '0s' }} />
            <div className="leaf-spore" style={{ left: '70%', animationDelay: '2s' }} />
          </>
        );
      case 'psychic':
      case 'ghost':
      case 'dark':
        return <div className="cosmic-orb" style={{ top: '20%', left: '20%' }} />;
      case 'dragon':
        return <div className="dragon-aura" />;
      case 'blended':
        return (
          <>
            <div className="blended-dual-spark" />
            <div className="ember-particle" style={{ left: '20%', animationDelay: '0.5s' }} />
            <div className="water-bubble" style={{ left: '70%', width: '14px', height: '14px', animationDelay: '1.8s' }} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="power-card-stage" onClick={onClick}>
      <div
        ref={cardRef}
        className="power-card"
        style={tiltStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`power-card-canvas type-theme-${activeTheme}`}>
          {/* Background particle canvas */}
          <div className="type-bg-canvas">{renderThemeParticles()}</div>

          {/* Holographic Sheen & Foil Overlays */}
          <div className="power-card-holo-sheen" style={sheenStyle} />
          <div className="power-card-foil-pattern" />

          {/* Header Bar */}
          <div className="power-card-header">
            <div className="power-card-title-group">
              <span className="power-card-badge">POWER</span>
              <span className="power-card-name">{pokemon.name}</span>
            </div>
            <div className="power-card-hp-box">
              <span className="power-card-hp-label">HP</span>
              <span className="power-card-hp-val">{pokemon.stats?.hp || 100}</span>
            </div>
          </div>

          {/* Out-of-Bounds Artwork Container */}
          <div className="power-card-art-container">
            <div className="power-card-art-frame" />
            <img
              src={spriteUrl}
              alt={pokemon.name}
              className="power-card-sprite-breakout"
            />
            {isShiny && <div className="power-card-shiny-badge" title="Shiny Card">✨</div>}
          </div>

          {/* Card Body Details */}
          <div className="power-card-body">
            {/* Types & Rarity Stars */}
            <div className="power-card-types-row">
              <div className="power-card-type-pills">
                <span
                  className="power-type-pill"
                  style={{ backgroundColor: TYPE_COLORS[primaryType] || '#64748b' }}
                >
                  {primaryType}
                </span>
                {secondaryType && (
                  <span
                    className="power-type-pill"
                    style={{ backgroundColor: TYPE_COLORS[secondaryType] || '#64748b' }}
                  >
                    {secondaryType}
                  </span>
                )}
              </div>
              <div className="power-card-rarity-stars">★★★★★</div>
            </div>

            {/* Signature Move Box */}
            <div className="power-card-move-box">
              <span className="power-card-move-name">{signatureMove.name}</span>
              <span className="power-card-move-power">{signatureMove.power || 100}</span>
            </div>

            {/* Stats Grid */}
            <div className="power-card-stats-grid">
              <div className="power-stat-item">
                <span className="power-stat-label">ATK</span>
                <span className="power-stat-val">{pokemon.stats?.attack || 0}</span>
              </div>
              <div className="power-stat-item">
                <span className="power-stat-label">DEF</span>
                <span className="power-stat-val">{pokemon.stats?.defense || 0}</span>
              </div>
              <div className="power-stat-item">
                <span className="power-stat-label">SPD</span>
                <span className="power-stat-val">{pokemon.stats?.speed || 0}</span>
              </div>
            </div>

            {/* Footer Collector Stamp */}
            <div className="power-card-footer">
              <span>PROMO #PWR-{(pokemon.id || 1).toString().padStart(3, '0')}</span>
              <span className="power-card-collector-num">ULTRA RARE FOIL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

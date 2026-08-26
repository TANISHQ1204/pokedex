import React, { useState, useRef } from 'react';
import './AncientCard.css';

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

function getGeneration(pokemonId) {
  if (pokemonId <= 151) return 1;
  if (pokemonId <= 251) return 2;
  if (pokemonId <= 386) return 3;
  if (pokemonId <= 493) return 4;
  if (pokemonId <= 649) return 5;
  if (pokemonId <= 721) return 6;
  if (pokemonId <= 809) return 7;
  if (pokemonId <= 905) return 8;
  return 9;
}

const GEN_NAMES = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Unova',
  6: 'Kalos',
  7: 'Alola',
  8: 'Galar',
  9: 'Paldea',
};

export default function AncientCard({
  pokemon,
  enableTilt = true,
  onClick = null,
}) {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});

  if (!pokemon) return null;

  const gen = getGeneration(pokemon.id);
  const genName = GEN_NAMES[gen] || 'Unknown';
  const primaryType = pokemon.types?.[0] || 'normal';
  const spriteUrl = pokemon.sprites?.normal;
  const signatureMove = pokemon.moves?.[0] || { name: 'Ancient Power', power: 60, type: primaryType };

  const handleMouseMove = (e) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    setTiltStyle({
      transform: `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.03)`,
    });
  };

  const handleMouseLeave = () => {
    if (!enableTilt) return;
    setTiltStyle({ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' });
  };

  return (
    <div className="ancient-card-stage" onClick={onClick}>
      <div
        ref={cardRef}
        className={`ancient-card ancient-gen-${gen}`}
        style={tiltStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="ancient-canvas">
          {/* Worn texture overlay */}
          <div className="ancient-texture" />
          <div className="ancient-vignette" />
          <div className="ancient-dust" />

          {/* Inner worn border */}
          <div className="ancient-inner-border" />

          {/* Header */}
          <div className="ancient-header">
            <div className="ancient-header-left">
              <span className="ancient-badge">ANCIENT</span>
              <span className="ancient-gen-badge">{genName}</span>
              <span className="ancient-name">{pokemon.name}</span>
            </div>
            <div className="ancient-hp">
              <span className="ancient-hp-label">HP</span>
              <span className="ancient-hp-val">{pokemon.stats?.hp || 100}</span>
            </div>
          </div>

          {/* Artwork */}
          <div className="ancient-art-area">
            <div className="ancient-art-frame" />
            <img src={spriteUrl} alt={pokemon.name} className="ancient-sprite" />
          </div>

          {/* Body */}
          <div className="ancient-body">
            <div className="ancient-types-row">
              {pokemon.types?.map((t) => (
                <span
                  key={t}
                  className="ancient-type-pill"
                  style={{ '--pill-color': TYPE_COLORS[t] || '#64748b' }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="ancient-move-box">
              <span className="ancient-move-name">{signatureMove.name}</span>
              <span className="ancient-move-power">{signatureMove.power || '--'}</span>
            </div>

            <div className="ancient-stats">
              {[
                { label: 'ATK', val: pokemon.stats?.attack },
                { label: 'DEF', val: pokemon.stats?.defense },
                { label: 'SPD', val: pokemon.stats?.speed },
              ].map((s) => (
                <div key={s.label} className="ancient-stat">
                  <span className="ancient-stat-label">{s.label}</span>
                  <span className="ancient-stat-val">{s.val || 0}</span>
                </div>
              ))}
            </div>

            <div className="ancient-footer">
              <span>RELIC #ANT-{(pokemon.id || 1).toString().padStart(3, '0')}</span>
              <span className="ancient-footer-rarity">ANCIENT RELIC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

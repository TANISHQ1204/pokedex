import React, { useState } from 'react';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const CARD_TYPE_CHIP = {
  normal: { label: 'NORMAL', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  power: { label: '⚡ POWER', color: '#ffd700', bg: 'rgba(236, 72, 153, 0.2)' },
  ancient: { label: '🏛️ ANCIENT', color: '#b89a6c', bg: 'rgba(184, 154, 108, 0.2)' },
};

export default function PokemonDetailModal({
  pokemon,
  entry = null,
  cardType = 'normal',
  onClose,
}) {
  const isOwned = Boolean(entry);
  const starLevel = entry?.star_level || 0;
  const [previewShiny, setPreviewShiny] = useState(isOwned && (entry?.is_shiny || starLevel >= 5));

  if (!pokemon) return null;

  const chip = CARD_TYPE_CHIP[cardType] || CARD_TYPE_CHIP.normal;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="modal-dex-id">#{String(pokemon.id).padStart(4, '0')}</span>
            {cardType !== 'normal' && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  color: chip.color,
                  background: chip.bg,
                }}
              >
                {chip.label}
              </span>
            )}
            <h2 className="modal-title">{isOwned ? formatTitle(pokemon.name) : '???'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Left Column: Image & Ownership status */}
          <div className="modal-left">
            <div className="modal-image-card">
              <img
                src={previewShiny && isOwned ? pokemon.sprites.shiny : pokemon.sprites.normal}
                alt={pokemon.name}
                className={isOwned ? '' : 'modal-silhouette'}
              />
            </div>

            {isOwned && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                <button
                  className={`preview-toggle-btn ${!previewShiny ? 'active' : ''}`}
                  onClick={() => setPreviewShiny(false)}
                >
                  Normal
                </button>
                <button
                  className={`preview-toggle-btn ${previewShiny ? 'active' : ''}`}
                  onClick={() => setPreviewShiny(true)}
                >
                  ✨ Shiny
                </button>
              </div>
            )}

            <div className="modal-status-box">
              {isOwned ? (
                cardType === 'power' ? (
                  <>
                    <div className="modal-star-row">⚡ ⭐</div>
                    <div style={{ fontSize: '0.8rem', color: '#ec4899', marginTop: '0.25rem' }}>
                      Power Card · Single Copy
                    </div>
                  </>
                ) : cardType === 'ancient' ? (
                  <>
                    <div className="modal-star-row">🏛️ ⭐</div>
                    <div style={{ fontSize: '0.8rem', color: '#b89a6c', marginTop: '0.25rem' }}>
                      Ancient Card · Single Copy
                    </div>
                  </>
                ) : (
                  <>
                    <div className="modal-star-row">
                      {'★'.repeat(entry.star_level)}
                      {'☆'.repeat(5 - entry.star_level)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Duplicates Collected: {entry.dupes_collected || 0}
                    </div>
                  </>
                )
              ) : (
                <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.875rem' }}>
                  Not in Collection Yet (Win battles to unlock!)
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Types, Stats & Moveset */}
          <div className="modal-right">
            {/* Types */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                TYPES &amp; EVOLUTION
              </span>
              <div>
                {pokemon.types.map((t) => (
                  <span key={t} className={`pokemon-type-badge type-${t}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                    {t}
                  </span>
                ))}
                <span
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.25rem',
                    backgroundColor: pokemon.isFinalEvolution ? '#065f46' : '#334155',
                    color: pokemon.isFinalEvolution ? '#a7f3d0' : '#cbd5e1',
                    fontWeight: 600,
                  }}
                >
                  {pokemon.isFinalEvolution ? 'Final Evolution' : 'Can Evolve'}
                </span>
              </div>
            </div>

            {/* Base Stats */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                BASE STATS
              </span>
              <div className="stat-bars-container">
                {[
                  { label: 'HP', val: pokemon.stats.hp, max: 250, color: '#22c55e' },
                  { label: 'ATK', val: pokemon.stats.attack, max: 190, color: '#ef4444' },
                  { label: 'DEF', val: pokemon.stats.defense, max: 230, color: '#3b82f6' },
                  { label: 'SP.ATK', val: pokemon.stats.specialAttack, max: 194, color: '#a855f7' },
                  { label: 'SP.DEF', val: pokemon.stats.specialDefense, max: 230, color: '#06b6d4' },
                  { label: 'SPD', val: pokemon.stats.speed, max: 200, color: '#eab308' },
                ].map((stat) => (
                  <div key={stat.label} className="stat-row">
                    <span className="stat-label">{stat.label}</span>
                    <span className="stat-val stat-number-condensed">{stat.val}</span>
                    <div className="stat-bar-outer">
                      <div
                        className="stat-bar-inner"
                        style={{
                          width: `${Math.min(100, (stat.val / stat.max) * 100)}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4-Move Moveset */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                BATTLE MOVESET
              </span>
              <div className="modal-moves-grid">
                {pokemon.moves?.map((m, mIdx) => (
                  <div key={mIdx} className="modal-move-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{m.name}</span>
                      <span className={`pokemon-type-badge type-${m.type}`}>{m.type}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                      <span>Cat: {m.category}</span> | <span>Pwr: {m.power || '--'}</span> | <span>PP: {m.pp}/{m.maxPp}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      {m.effect}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
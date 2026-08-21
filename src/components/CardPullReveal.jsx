import React, { useState, useEffect } from 'react';

export default function CardPullReveal({ awardedDrop, onContinue, onPlayAgain }) {
  // Stages: 'anticipating' (shake) -> 'flipping' (3D flip) -> 'revealed' (flash & badges)
  const [stage, setStage] = useState('anticipating');
  const [showFlash, setShowFlash] = useState(false);

  const pokemon = awardedDrop?.pokemon;
  const entry = awardedDrop?.entry || {};
  const isNew = Boolean(awardedDrop?.isNew);
  const becameShiny = Boolean(awardedDrop?.becameShiny || entry.is_shiny);
  const starUpgraded = Boolean(awardedDrop?.starUpgraded);

  const starLevel = Math.max(1, Math.min(5, entry.star_level || 1));
  const dupesCount = entry.dupes_collected || 0;

  useEffect(() => {
    // Stage 1: Anticipation phase (1.2 seconds shake)
    const timer1 = setTimeout(() => {
      setStage('flipping');
    }, 1200);

    // Stage 2: Flip & Reveal phase (0.8s 3D flip)
    const timer2 = setTimeout(() => {
      setStage('revealed');
      setShowFlash(true);
    }, 1900);

    // Turn off flash burst after animation ends
    const timer3 = setTimeout(() => {
      setShowFlash(false);
    }, 3100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  if (!pokemon) return null;

  // Determine flash effect type
  let flashClass = 'flash-dupe';
  if (becameShiny) {
    flashClass = 'flash-shiny';
  } else if (isNew) {
    flashClass = 'flash-new';
  }

  // Determine sprite artwork
  const spriteUrl = becameShiny ? pokemon.sprites.shiny : pokemon.sprites.normal;

  return (
    <div className="card-reveal-overlay">
      {/* Light Flash Burst */}
      {showFlash && <div className={`flash-burst ${flashClass}`} />}

      <h2
        style={{
          color: '#f8fafc',
          fontSize: '1.75rem',
          margin: '0 0 1.5rem 0',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: '0 0 15px rgba(245, 158, 11, 0.5)',
        }}
      >
        {stage === 'anticipating' ? '⚡ CARD PULL UNLOCKED!' : becameShiny ? '✨ SHINY CARD UNLOCKED! ✨' : '🎉 CARD REVEALED!'}
      </h2>

      {/* 3D CARD CONTAINER */}
      <div className="card-3d-wrapper">
        <div
          className={`card-3d-body ${stage === 'anticipating' ? 'anticipating' : ''} ${
            stage === 'revealed' || stage === 'flipping' ? 'flipped' : ''
          }`}
        >
          {/* CARD BACK SIDE */}
          <div className="card-face card-back">
            <div className="card-back-pattern">
              <div style={{ fontSize: '3rem', margin: 0 }}>⚡</div>
              <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800, marginTop: '0.5rem' }}>
                POKÉDEX
              </div>
            </div>
          </div>

          {/* CARD FRONT SIDE */}
          <div className={`card-face card-front ${becameShiny ? 'is-shiny-card' : ''}`}>
            {becameShiny && <div className="shiny-sparkle-overlay" />}

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', textTransform: 'capitalize' }}>
                {pokemon.name}
              </span>
              <span>
                {pokemon.types.map((t) => (
                  <span key={t} className={`pokemon-type-badge type-${t}`}>
                    {t}
                  </span>
                ))}
              </span>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img
                src={spriteUrl}
                alt={pokemon.name}
                style={{
                  width: '140px',
                  height: '140px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5))',
                }}
              />
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '1.35rem', color: '#fbbf24', letterSpacing: '2px', margin: '0.2rem 0' }}>
                {'⭐'.repeat(starLevel)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                ID #{pokemon.id.toString().padStart(3, '0')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* METADATA & BADGES (Revealed Stage Only) */}
      <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        {stage === 'revealed' && (
          <>
            {becameShiny && (
              <div className="card-badge-shiny">
                ✨ MAXED — SHINY UNLOCKED! ✨
              </div>
            )}

            {!becameShiny && isNew && (
              <div className="card-badge-new">
                🌟 NEW CARD COLLECTED!
              </div>
            )}

            {!becameShiny && !isNew && starUpgraded && (
              <div className="card-badge-new" style={{ background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }}>
                ⭐ STAR LEVEL UPGRADED! (Star {starLevel})
              </div>
            )}

            <div style={{ color: '#cbd5e1', fontSize: '1rem', textAlign: 'center' }}>
              <strong style={{ color: '#f8fafc', textTransform: 'capitalize' }}>{pokemon.name}</strong> • {'⭐'.repeat(starLevel)}
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Total Duplicates Collected: <strong>{dupesCount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={onContinue}
                style={{
                  padding: '0.875rem 1.75rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
                  transition: 'transform 0.15s, background-color 0.2s',
                }}
              >
                Continue to Home
              </button>

              <button
                onClick={onPlayAgain}
                style={{
                  padding: '0.875rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                Battle Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

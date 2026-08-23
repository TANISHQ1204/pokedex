import React, { useState, useEffect } from 'react';

export default function CardPullReveal({ awardedDrop, onContinue, onPlayAgain }) {
  // Stages: 'anticipating' (shake) -> 'flipping' (3D flip) -> 'revealed' (flash & badges)
  const [stage, setStage] = useState('anticipating');
  const [showFlash, setShowFlash] = useState(false);

  const pokemon = awardedDrop?.pokemon;
  const entry = awardedDrop?.entry || {};
  const isNew = Boolean(awardedDrop?.isNew);
  const becameShiny = Boolean(awardedDrop?.becameShiny);
  const starUpgraded = Boolean(awardedDrop?.starUpgraded);

  const starLevel = Math.max(1, Math.min(5, entry.star_level || 1));
  const dupesCount = entry.dupes_collected || 0;

  // Live Sprite Transformation & Star Upgrade States
  const [displayedSprite, setDisplayedSprite] = useState(pokemon?.sprites?.normal);
  const [isShinyUnlocked, setIsShinyUnlocked] = useState(false);
  const [isShinyTransforming, setIsShinyTransforming] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);

  useEffect(() => {
    if (!pokemon) return;

    // Set initial artwork: if becameShiny, start with normal sprite so it can visibly transform on screen!
    if (!becameShiny && entry.is_shiny) {
      setDisplayedSprite(pokemon.sprites.shiny);
      setIsShinyUnlocked(true);
    } else {
      setDisplayedSprite(pokemon.sprites.normal);
      setIsShinyUnlocked(false);
    }

    // Stage 1: Anticipation phase (1.2 seconds shake)
    const timer1 = setTimeout(() => {
      setStage('flipping');
    }, 1200);

    // Stage 2: Flip & Reveal phase (0.8s 3D flip)
    const timer2 = setTimeout(() => {
      setStage('revealed');
      setShowFlash(true);
    }, 1900);

    // Stage 3A: Star Upgrade Animation (if star upgraded but not shiny maxed)
    let starTimer;
    if (starUpgraded && !becameShiny) {
      starTimer = setTimeout(() => {
        setIsStarBursting(true);
      }, 2200);
    }

    // Stage 3B: Shiny Transformation Sequence (Visually transforms normal -> shiny artwork on screen!)
    let shinyTimer1, shinyTimer2;
    if (becameShiny) {
      // Trigger dramatic transformation pulse 0.6s after card flip
      shinyTimer1 = setTimeout(() => {
        setIsShinyTransforming(true);
      }, 2500);

      // Swap sprite artwork & complete transformation
      shinyTimer2 = setTimeout(() => {
        setDisplayedSprite(pokemon.sprites.shiny);
        setIsShinyUnlocked(true);
        setIsShinyTransforming(false);
      }, 2900);
    }

    // Turn off initial flash burst after animation ends
    const timer3 = setTimeout(() => {
      setShowFlash(false);
    }, 3100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (starTimer) clearTimeout(starTimer);
      if (shinyTimer1) clearTimeout(shinyTimer1);
      if (shinyTimer2) clearTimeout(shinyTimer2);
    };
  }, [pokemon, becameShiny, starUpgraded, entry.is_shiny]);

  if (!pokemon) return null;

  // Determine flash effect type
  let flashClass = 'flash-dupe';
  if (becameShiny || isShinyUnlocked) {
    flashClass = 'flash-shiny';
  } else if (isNew) {
    flashClass = 'flash-new';
  }

  const handleOverlayClick = (e) => {
    if (e.target.closest('button')) return;

    if (stage !== 'revealed') {
      setStage('revealed');
      setShowFlash(false);
      if (becameShiny || entry.is_shiny) {
        setDisplayedSprite(pokemon.sprites.shiny);
        setIsShinyUnlocked(true);
        setIsShinyTransforming(false);
      }
    }
  };

  return (
    <div className="card-reveal-overlay" onClick={handleOverlayClick}>
      {/* Light Flash Burst */}
      {showFlash && <div className={`flash-burst ${flashClass}`} />}

      {/* Dramatic Shiny Transformation Screen Burst */}
      {isShinyTransforming && <div className="shiny-transform-flash" />}

      {stage !== 'revealed' && (
        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
          (Click anywhere to skip animation)
        </div>
      )}

      <h2
        style={{
          color: '#f8fafc',
          fontSize: '1.75rem',
          margin: '0 0 1.5rem 0',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: isShinyUnlocked || isShinyTransforming ? '0 0 25px rgba(250, 204, 21, 0.9)' : '0 0 15px rgba(245, 158, 11, 0.5)',
          transition: 'all 0.3s ease',
        }}
      >
        {stage === 'anticipating'
          ? '⚡ CARD PULL UNLOCKED!'
          : isShinyUnlocked || isShinyTransforming
          ? '✨ SHINY CARD UNLOCKED! ✨'
          : starUpgraded
          ? '⭐ STAR LEVEL UPGRADED!'
          : '🎉 CARD REVEALED!'}
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
          <div
            className={`card-face card-front ${isShinyUnlocked ? 'is-shiny-card' : ''} ${
              isStarBursting ? 'card-star-glow' : ''
            }`}
          >
            {isShinyUnlocked && <div className="shiny-sparkle-overlay" />}

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
                src={displayedSprite}
                alt={pokemon.name}
                className={isShinyTransforming ? 'shiny-sprite-transform' : ''}
                style={{
                  width: '140px',
                  height: '140px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5))',
                  transition: 'all 0.4s ease-in-out',
                }}
              />
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '1.35rem', color: '#fbbf24', letterSpacing: '2px', margin: '0.2rem 0' }}>
                {Array.from({ length: starLevel }).map((_, sIdx) => {
                  const isNewestStar = isStarBursting && sIdx === starLevel - 1;
                  return (
                    <span
                      key={sIdx}
                      className={isNewestStar ? 'star-upgrade-burst' : ''}
                      style={{ display: 'inline-block', margin: '0 1px' }}
                    >
                      ⭐
                    </span>
                  );
                })}
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
            {(becameShiny || isShinyUnlocked) && (
              <div className="card-badge-shiny">
                ✨ MAXED — SHINY UNLOCKED! ✨
              </div>
            )}

            {!isShinyUnlocked && !becameShiny && isNew && (
              <div className="card-badge-new">
                🌟 NEW CARD COLLECTED!
              </div>
            )}

            {!isShinyUnlocked && !becameShiny && !isNew && starUpgraded && (
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

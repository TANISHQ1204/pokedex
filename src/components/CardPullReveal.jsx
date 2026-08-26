import React, { useState, useEffect } from 'react';
import PowerCard from './PowerCard';

export default function CardPullReveal({ awardedDrop, onContinue, onPlayAgain }) {
  // Phase: 'normal' (first drop) -> 'power' (bonus Power Card drop if earned)
  const [phase, setPhase] = useState('normal');
  const [stage, setStage] = useState('anticipating');
  const [showFlash, setShowFlash] = useState(false);

  const hasPowerCardBonus = Boolean(awardedDrop?.powerCardDrop);
  const currentDrop = phase === 'power' && hasPowerCardBonus ? awardedDrop.powerCardDrop : awardedDrop;

  const pokemon = currentDrop?.pokemon;
  const entry = currentDrop?.entry || {};
  const isNew = Boolean(currentDrop?.isNew);
  const becameShiny = Boolean(currentDrop?.becameShiny);
  const starUpgraded = Boolean(currentDrop?.starUpgraded);
  const isPowerCard = phase === 'power' || Boolean(currentDrop?.isPowerCard);

  const starLevel = Math.max(1, Math.min(5, entry.star_level || 1));
  const dupesCount = entry.dupes_collected || 0;

  // Live Sprite Transformation & Star Upgrade States
  const [displayedSprite, setDisplayedSprite] = useState(pokemon?.sprites?.normal);
  const [isShinyUnlocked, setIsShinyUnlocked] = useState(false);
  const [isShinyTransforming, setIsShinyTransforming] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);

  // Reset phase when new drop arrives
  useEffect(() => {
    setPhase('normal');
  }, [awardedDrop]);

  useEffect(() => {
    if (!pokemon) return;

    setStage('anticipating');

    if (!becameShiny && entry.is_shiny) {
      setDisplayedSprite(pokemon.sprites.shiny);
      setIsShinyUnlocked(true);
    } else {
      setDisplayedSprite(pokemon.sprites.normal);
      setIsShinyUnlocked(false);
    }

    const timer1 = setTimeout(() => {
      setStage('flipping');
    }, 1200);

    const timer2 = setTimeout(() => {
      setStage('revealed');
      setShowFlash(true);
    }, 1900);

    let starTimer;
    if (starUpgraded && !becameShiny && !isPowerCard) {
      starTimer = setTimeout(() => {
        setIsStarBursting(true);
      }, 2200);
    }

    let shinyTimer1, shinyTimer2;
    if (becameShiny && !isPowerCard) {
      shinyTimer1 = setTimeout(() => {
        setIsShinyTransforming(true);
      }, 2500);

      shinyTimer2 = setTimeout(() => {
        setDisplayedSprite(pokemon.sprites.shiny);
        setIsShinyUnlocked(true);
        setIsShinyTransforming(false);
      }, 2900);
    }

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
  }, [pokemon, phase, becameShiny, starUpgraded, entry.is_shiny, isPowerCard]);

  if (!pokemon) return null;

  let flashClass = 'flash-dupe';
  if (isPowerCard || becameShiny || isShinyUnlocked) {
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

  const handleNextPhaseOrContinue = () => {
    if (phase === 'normal' && hasPowerCardBonus) {
      setPhase('power');
    } else {
      onContinue();
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
          color: isPowerCard ? '#ffd700' : '#f8fafc',
          fontSize: '1.75rem',
          margin: '0 0 1.5rem 0',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: isPowerCard
            ? '0 0 30px rgba(255, 215, 0, 0.9)'
            : isShinyUnlocked || isShinyTransforming
            ? '0 0 25px rgba(250, 204, 21, 0.9)'
            : '0 0 15px rgba(245, 158, 11, 0.5)',
          transition: 'all 0.3s ease',
        }}
      >
        {isPowerCard
          ? '⚡ BONUS POWER CARD UNLOCKED! ⚡'
          : stage === 'anticipating'
          ? '⚡ CARD PULL UNLOCKED!'
          : isShinyUnlocked || isShinyTransforming
          ? '✨ SHINY CARD UNLOCKED! ✨'
          : starUpgraded
          ? '⭐ STAR LEVEL UPGRADED!'
          : '🎉 CARD REVEALED!'}
      </h2>

      {/* RENDER POWER CARD IF IN POWER CARD PHASE */}
      {isPowerCard ? (
        <div style={{ margin: '10px 0 20px 0', transform: stage === 'anticipating' ? 'scale(0.85)' : 'scale(1)', transition: 'transform 0.4s' }}>
          <PowerCard pokemon={pokemon} enableTilt={stage === 'revealed'} />
        </div>
      ) : (
        /* STANDARD 3D CARD CONTAINER */
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
      )}

      {/* METADATA & BADGES (Revealed Stage Only) */}
      <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        {stage === 'revealed' && (
          <>
            {isPowerCard ? (
              <div className="card-badge-shiny" style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #ffd700)', color: '#ffffff' }}>
                ⚡ ULTRA RARE POWER CARD UNLOCKED! ⚡
              </div>
            ) : (
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
              </>
            )}

            <div style={{ color: '#cbd5e1', fontSize: '1rem', textAlign: 'center' }}>
              <strong style={{ color: '#f8fafc', textTransform: 'capitalize' }}>{pokemon.name}</strong>
              {!isPowerCard && <> • {'⭐'.repeat(starLevel)}</>}
              {!isPowerCard && (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Total Duplicates Collected: <strong>{dupesCount}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {phase === 'normal' && hasPowerCardBonus && (
                <button
                  onClick={() => setPhase('power')}
                  style={{
                    padding: '0.875rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.6)',
                  }}
                >
                  ⚡ REVEAL BONUS POWER CARD!
                </button>
              )}

              <button
                onClick={onContinue}
                style={{
                  padding: '0.875rem 1.5rem',
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

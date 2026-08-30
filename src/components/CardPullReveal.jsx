import React, { useState, useEffect } from 'react';
import PowerCard from './PowerCard';
import AncientCard from './AncientCard';
import PokemonDetailModal from './PokemonDetailModal';
import { glowBaseFor } from '../utils/glow';

export default function CardPullReveal({ awardedDrop, onContinue, onPlayAgain }) {
  const [stage, setStage] = useState('anticipating');
  const [showFlash, setShowFlash] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const dropType = awardedDrop?.dropType || 'normal';
  const pokemon = awardedDrop?.pokemon;
  const entry = awardedDrop?.entry || {};
  const isNew = Boolean(awardedDrop?.isNew);
  const becameShiny = Boolean(awardedDrop?.becameShiny);
  const starUpgraded = Boolean(awardedDrop?.starUpgraded);
  const alreadyOwned = Boolean(awardedDrop?.alreadyOwned);

  const isPowerCard = dropType === 'power';
  const isAncientCard = dropType === 'ancient';
  const isSpecial = isPowerCard || isAncientCard;

  const starLevel = Math.max(1, Math.min(5, entry.star_level || 1));
  const dupesCount = entry.dupes_collected || 0;

  const [displayedSprite, setDisplayedSprite] = useState(pokemon?.sprites?.normal);
  const [isShinyUnlocked, setIsShinyUnlocked] = useState(false);
  const [isShinyTransforming, setIsShinyTransforming] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);

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

    const timer1 = setTimeout(() => setStage('flipping'), 1200);
    const timer2 = setTimeout(() => { setStage('revealed'); setShowFlash(true); }, 1900);

    let starTimer;
    if (starUpgraded && !becameShiny && !isSpecial) {
      starTimer = setTimeout(() => setIsStarBursting(true), 2200);
    }

    let shinyTimer1, shinyTimer2;
    if (becameShiny && !isSpecial) {
      shinyTimer1 = setTimeout(() => setIsShinyTransforming(true), 2500);
      shinyTimer2 = setTimeout(() => {
        setDisplayedSprite(pokemon.sprites.shiny);
        setIsShinyUnlocked(true);
        setIsShinyTransforming(false);
      }, 2900);
    }

    const timer3 = setTimeout(() => setShowFlash(false), 3100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (starTimer) clearTimeout(starTimer);
      if (shinyTimer1) clearTimeout(shinyTimer1);
      if (shinyTimer2) clearTimeout(shinyTimer2);
    };
  }, [pokemon, becameShiny, starUpgraded, entry.is_shiny, isSpecial]);

  if (!pokemon) return null;

  let flashClass = 'flash-dupe';
  if (isSpecial || becameShiny || isShinyUnlocked) {
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

  // Badge text
  let badgeText = '';
  let badgeStyle = {};
  if (isPowerCard) {
    badgeText = '⚡ ULTRA RARE POWER CARD UNLOCKED! ⚡';
    badgeStyle = { background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #ffd700)', color: '#ffffff' };
  } else if (isAncientCard) {
    badgeText = '🏛️ ANCIENT RELIC CARD UNLOCKED! 🏛️';
    badgeStyle = { background: 'linear-gradient(90deg, #b89a6c, #8a6a3c, #c9a84c)', color: '#1a1612' };
  } else if (becameShiny || isShinyUnlocked) {
    badgeText = '✨ MAXED — SHINY UNLOCKED! ✨';
  } else if (isNew) {
    badgeText = '🌟 NEW CARD COLLECTED!';
  } else if (starUpgraded) {
    badgeText = `⭐ STAR LEVEL UPGRADED! (Star ${starLevel})`;
  }

  // Title text
  let titleText = '';
  if (stage === 'anticipating') {
    titleText = isPowerCard ? '⚡ POWER CARD INCOMING!' : isAncientCard ? '🏛️ ANCIENT CARD INCOMING!' : '⚡ CARD PULL UNLOCKED!';
  } else if (isPowerCard) {
    titleText = '⚡ POWER CARD UNLOCKED! ⚡';
  } else if (isAncientCard) {
    titleText = '🏛️ ANCIENT CARD UNLOCKED! 🏛️';
  } else if (isShinyUnlocked || isShinyTransforming) {
    titleText = '✨ SHINY CARD UNLOCKED! ✨';
  } else if (starUpgraded) {
    titleText = '⭐ STAR LEVEL UPGRADED!';
  } else {
    titleText = '🎉 CARD REVEALED!';
  }

  const titleColor = isPowerCard ? '#ffd700' : isAncientCard ? '#b89a6c' : '#f8fafc';
  const titleShadow = isPowerCard
    ? '0 0 30px rgba(255, 215, 0, 0.9)'
    : isAncientCard
    ? '0 0 30px rgba(184, 154, 108, 0.9)'
    : isShinyUnlocked || isShinyTransforming
    ? '0 0 25px rgba(250, 204, 21, 0.9)'
    : '0 0 15px rgba(245, 158, 11, 0.5)';

  return (
    <div className="card-reveal-overlay" onClick={handleOverlayClick}>
      <div className="card-reveal-inner">
      {showFlash && <div className={`flash-burst ${flashClass}`} />}
      {isShinyTransforming && <div className="shiny-transform-flash" />}

      {stage !== 'revealed' && (
        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
          (Click anywhere to skip animation)
        </div>
      )}

      <h2 style={{
        color: titleColor,
        fontSize: '1.75rem',
        margin: '0 0 1.5rem 0',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        textShadow: titleShadow,
        transition: 'all 0.3s ease',
      }}>
        {titleText}
      </h2>

      {/* RENDER SPECIAL CARDS (Power or Ancient) */}
      {isSpecial ? (
        <div style={{ margin: '10px 0 20px 0', transform: stage === 'anticipating' ? 'scale(0.85)' : 'scale(1)', transition: 'transform 0.4s' }}>
          {isPowerCard ? (
            <PowerCard pokemon={pokemon} enableTilt={stage === 'revealed'} onClick={() => { if (stage === 'revealed') setShowInfo(true); }} />
          ) : (
            <AncientCard pokemon={pokemon} enableTilt={stage === 'revealed'} onClick={() => { if (stage === 'revealed') setShowInfo(true); }} />
          )}
        </div>
      ) : (
        /* STANDARD 3D CARD CONTAINER (Normal cards) */
        <div className="card-3d-wrapper" onClick={stage === 'revealed' ? () => setShowInfo(true) : undefined} style={stage === 'revealed' ? { cursor: 'pointer' } : undefined}>
          <div className={`card-3d-body ${stage === 'anticipating' ? 'anticipating' : ''} ${
            stage === 'revealed' || stage === 'flipping' ? 'flipped' : ''
          }`}>
            <div className="card-face card-back">
              <div className="card-back-pattern">
                <div style={{ fontSize: '3rem', margin: 0 }}>⚡</div>
                <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800, marginTop: '0.5rem' }}>POKÉDEX</div>
              </div>
            </div>

            <div
              className={`card-face card-front ${isShinyUnlocked ? 'is-shiny-card' : ''} ${
                isStarBursting ? 'card-star-glow' : ''
              }`}
              data-glow
              style={{ '--base': glowBaseFor(pokemon.types) }}
            >
              <span className="card-glow-overlay" data-glow aria-hidden="true" />
              {isShinyUnlocked && <div className="shiny-sparkle-overlay" />}

              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', textTransform: 'capitalize' }}>
                  {pokemon.name}
                </span>
                <span>
                  {pokemon.types.map((t) => (
                    <span key={t} className={`pokemon-type-badge type-${t}`}>{t}</span>
                  ))}
                </span>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <img
                  src={displayedSprite}
                  alt={pokemon.name}
                  className={isShinyTransforming ? 'shiny-sprite-transform' : ''}
                  style={{
                    width: '140px', height: '140px', objectFit: 'contain',
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
                      <span key={sIdx} className={isNewestStar ? 'star-upgrade-burst' : ''} style={{ display: 'inline-block', margin: '0 1px' }}>
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

      {/* METADATA & BADGES */}
      <div style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        {stage === 'revealed' && (
          <>
            {badgeText && (
              <div className="card-badge-shiny" style={badgeStyle}>
                {badgeText}
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>💡 Click the card to view full details</div>

            <div style={{ color: '#cbd5e1', fontSize: '1rem', textAlign: 'center' }}>
              <strong style={{ color: '#f8fafc', textTransform: 'capitalize' }}>{pokemon.name}</strong>
              {!isSpecial && <> • {'⭐'.repeat(starLevel)}</>}
              {!isSpecial && (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Total Duplicates Collected: <strong>{dupesCount}</strong>
                </div>
              )}
              {isPowerCard && (
                <div style={{ color: '#ec4899', fontSize: '0.85rem', marginTop: '0.25rem' }}>Power Card • Single Copy</div>
              )}
              {isAncientCard && (
                <div style={{ color: '#b89a6c', fontSize: '0.85rem', marginTop: '0.25rem' }}>Ancient Card • Single Copy</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={onContinue}
                style={{
                  padding: '0.875rem 1.5rem', fontSize: '1rem', fontWeight: 700, color: '#ffffff',
                  backgroundColor: '#2563eb', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
                }}
              >
                Continue to Home
              </button>

              <button
                onClick={onPlayAgain}
                style={{
                  padding: '0.875rem 1.5rem', fontSize: '1rem', fontWeight: 700, color: '#f8fafc',
                  backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                Battle Again
              </button>
            </div>
          </>
        )}
      </div>

      {/* CARD DETAIL MODAL (click the revealed card to open) */}
      {showInfo && (
        <PokemonDetailModal
          pokemon={pokemon}
          entry={awardedDrop?.entry || null}
          cardType={dropType}
          onClose={() => setShowInfo(false)}
        />
      )}
      </div>
    </div>
  );
}

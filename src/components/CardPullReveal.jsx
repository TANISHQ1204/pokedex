import React, { useState, useEffect, useRef } from 'react';
import PowerCard from './PowerCard';
import AncientCard from './AncientCard';
import PokemonDetailModal from './PokemonDetailModal';
import StarMeter from './StarMeter';
import { glowBaseFor } from '../utils/glow';
import { spriteCdnUrl } from '../utils/sprites';
import { MAX_STAR_LEVEL, starTierClass } from '../game/cardLevels.js';
import { SparkleStarIcon } from './icons/GameIcons';
import useDialogFocus from '../hooks/useDialogFocus';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function CardPullReveal({
  awardedDrop,
  onContinue,
  onPlayAgain,
  continueLabel = 'Continue to Home',
  playAgainLabel = 'Battle Again',
  showPlayAgain = true,
}) {
  const [stage, setStage] = useState('anticipating');
  const [showFlash, setShowFlash] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const revealRef = useRef(null);
  const continueRef = useRef(null);

  useDialogFocus(revealRef);

  const dropType = awardedDrop?.dropType || 'normal';
  const pokemon = awardedDrop?.pokemon;
  const entry = awardedDrop?.entry || {};
  const isNew = Boolean(awardedDrop?.isNew);
  const becameShiny = Boolean(awardedDrop?.becameShiny);
  const starUpgraded = Boolean(awardedDrop?.starUpgraded);

  const isPowerCard = dropType === 'power';
  const isAncientCard = dropType === 'ancient';
  const isSpecial = isPowerCard || isAncientCard;

  const starLevel = Math.max(1, Math.min(MAX_STAR_LEVEL, entry.star_level || 1));
  const dupesCount = entry.dupes_collected || 0;
  const unlockedMove = awardedDrop?.unlockedMove || null;

  const [displayedSprite, setDisplayedSprite] = useState(pokemon?.sprites?.normal);
  const [spriteBroken, setSpriteBroken] = useState(false);
  const [isShinyUnlocked, setIsShinyUnlocked] = useState(false);
  const [isShinyTransforming, setIsShinyTransforming] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);

  useEffect(() => {
    if (!pokemon) return;

    setStage('anticipating');
    setSpriteBroken(false);

    if (!becameShiny && entry.is_shiny) {
      setDisplayedSprite(pokemon.sprites.shiny);
      setIsShinyUnlocked(true);
    } else {
      setDisplayedSprite(pokemon.sprites.normal);
      setIsShinyUnlocked(false);
    }

    const timer1 = setTimeout(() => setStage('flipping'), 1200);
    const timer2 = setTimeout(() => {
      setStage('revealed');
      setShowFlash(true);
    }, 1900);

    let starTimer;
    if (starUpgraded && !becameShiny && !isSpecial) {
      starTimer = setTimeout(() => setIsStarBursting(true), 2200);
    }

    let shinyTimer1;
    let shinyTimer2;
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

  useEffect(() => {
    if (stage !== 'revealed' || showInfo) return undefined;
    const frame = requestAnimationFrame(() => {
      if (!revealRef.current?.contains(document.activeElement) || document.activeElement === document.body) {
        continueRef.current?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [stage, showInfo]);

  if (!pokemon) return null;

  let flashClass = 'flash-dupe';
  if (isSpecial || becameShiny || isShinyUnlocked) {
    flashClass = 'flash-shiny';
  } else if (isNew) {
    flashClass = 'flash-new';
  }

  const skipToRevealed = () => {
    setStage('revealed');
    setShowFlash(false);
    if (becameShiny || entry.is_shiny) {
      setDisplayedSprite(pokemon.sprites.shiny);
      setIsShinyUnlocked(true);
      setIsShinyTransforming(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target.closest('button')) return;
    if (stage !== 'revealed') skipToRevealed();
  };

  let badgeText = '';
  let badgeVariant = '';
  if (isPowerCard) {
    badgeText = 'Ultra rare Power card unlocked';
    badgeVariant = 'is-power';
  } else if (isAncientCard) {
    badgeText = 'Ancient relic card unlocked';
    badgeVariant = 'is-ancient';
  } else if (becameShiny || isShinyUnlocked) {
    badgeText = 'Maxed - shiny unlocked';
    badgeVariant = 'is-shiny';
  } else if (isNew) {
    badgeText = 'New card collected';
    badgeVariant = 'is-new';
  } else if (starUpgraded) {
    badgeText = `Star level upgraded to ${starLevel}`;
    badgeVariant = 'is-star';
  }

  let titleText = '';
  if (stage === 'anticipating') {
    titleText = isPowerCard ? 'Power card incoming' : isAncientCard ? 'Ancient card incoming' : 'Card pull unlocked';
  } else if (isPowerCard) {
    titleText = 'Power card unlocked';
  } else if (isAncientCard) {
    titleText = 'Ancient card unlocked';
  } else if (isShinyUnlocked || isShinyTransforming) {
    titleText = 'Shiny card unlocked';
  } else if (starUpgraded) {
    titleText = 'Star level upgraded';
  } else {
    titleText = 'Card revealed';
  }

  const titleVariant = isPowerCard
    ? 'is-power'
    : isAncientCard
    ? 'is-ancient'
    : isShinyUnlocked || isShinyTransforming
    ? 'is-shiny'
    : 'is-standard';

  const handleCardKeyDown = (event) => {
    if (stage !== 'revealed') return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setShowInfo(true);
    }
  };

  return (
    <div className="card-reveal-overlay" onClick={handleOverlayClick}>
      <div ref={revealRef} className="card-reveal-inner" role="dialog" aria-modal="true" aria-labelledby="card-reveal-title" tabIndex={-1}>
        {showFlash && <div className={`flash-burst ${flashClass}`} aria-hidden="true" />}
        {isShinyTransforming && <div className="shiny-transform-flash" aria-hidden="true" />}

        {stage !== 'revealed' && (
          <button type="button" className="card-reveal-skip" onClick={skipToRevealed}>
            Skip animation
          </button>
        )}

        <h2 id="card-reveal-title" className={`card-reveal-title ${titleVariant}`} aria-live="polite">
          {titleText}
        </h2>

        {isSpecial ? (
          <div className={`card-reveal-special ${stage === 'anticipating' ? 'is-anticipating' : ''}`}>
            {isPowerCard ? (
              <PowerCard
                pokemon={pokemon}
                enableTilt={stage === 'revealed'}
                onClick={stage === 'revealed' ? () => setShowInfo(true) : null}
              />
            ) : (
              <AncientCard
                pokemon={pokemon}
                enableTilt={stage === 'revealed'}
                onClick={stage === 'revealed' ? () => setShowInfo(true) : null}
              />
            )}
          </div>
        ) : (
          <div
            className={`card-3d-wrapper ${stage === 'revealed' ? 'is-openable' : ''}`}
            onClick={stage === 'revealed' ? () => setShowInfo(true) : undefined}
            onKeyDown={handleCardKeyDown}
            role={stage === 'revealed' ? 'button' : undefined}
            tabIndex={stage === 'revealed' ? 0 : undefined}
            aria-label={stage === 'revealed' ? `Open details for ${formatTitle(pokemon.name)}` : undefined}
          >
            <div className={`card-3d-body ${stage === 'anticipating' ? 'anticipating' : ''} ${
              stage === 'revealed' || stage === 'flipping' ? 'flipped' : ''
            }`}>
              <div className="card-face card-back">
                <div className="card-back-pattern">
                  <SparkleStarIcon size={48} />
                  <span className="card-back-logo">POKEDEX</span>
                </div>
              </div>

              <div
                className={`card-face card-front ${isShinyUnlocked ? 'is-shiny-card' : ''} ${
                  isStarBursting ? 'card-star-glow' : ''
                } ${starTierClass(starLevel)}`}
                data-glow
                style={{ '--base': glowBaseFor(pokemon.types) }}
              >
                <span className="card-glow-overlay" data-glow aria-hidden="true" />
                {isShinyUnlocked && <span className="shiny-sparkle-overlay" aria-hidden="true" />}

                <div className="card-front-head">
                  <span className="card-front-name">{formatTitle(pokemon.name)}</span>
                  <span className="card-front-types">
                    {pokemon.types.map((type) => (
                      <span key={type} className={`pokemon-type-badge type-${type}`}>{type}</span>
                    ))}
                  </span>
                </div>

                <div className="card-front-art">
                  <img
                    src={spriteBroken ? spriteCdnUrl(pokemon.dexNo || pokemon.id, isShinyUnlocked) : displayedSprite}
                    alt={formatTitle(pokemon.name)}
                    className={isShinyTransforming ? 'card-front-sprite shiny-sprite-transform' : 'card-front-sprite'}
                    onError={() => {
                      if (!spriteBroken) setSpriteBroken(true);
                    }}
                  />
                </div>

                <div className="card-front-footer">
                  <span className={`card-front-stars ${isStarBursting ? 'star-upgrade-burst' : ''}`}>
                    <StarMeter starLevel={starLevel} size="lg" animated={isStarBursting} />
                  </span>
                  <span className="card-front-id">
                    ID #{String(pokemon.dexNo || pokemon.id).padStart(3, '0')}
                    {(pokemon.kind === 'form' || Number(pokemon.id) >= 10001) && pokemon.label ? ` - ${pokemon.label}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card-reveal-details">
          {stage === 'revealed' && (
            <>
              {badgeText && (
                <div className={`card-badge-shiny card-reveal-badge ${badgeVariant}`}>
                  {badgeText}
                </div>
              )}

              {unlockedMove && !isSpecial && (
                <div className={`move-unlock-chip card-reveal-move type-${unlockedMove.type || 'normal'}`}>
                  <span className="card-reveal-move-label">New move unlocked</span>
                  <strong>{unlockedMove.name}</strong>
                  <span>
                    {unlockedMove.power > 0
                      ? `Power ${unlockedMove.power}`
                      : unlockedMove.healPercent
                      ? `Heals ${Math.round(unlockedMove.healPercent * 100)}% HP`
                      : 'Status'}{' '}
                    - {unlockedMove.type}
                  </span>
                </div>
              )}

              <p className="card-reveal-hint">Select the card to view its full battle details.</p>

              <div className="card-reveal-meta">
                <strong>{formatTitle(pokemon.name)}</strong>
                {!isSpecial && (
                  <span>Total duplicates collected: <strong>{dupesCount}</strong></span>
                )}
                {isPowerCard && <span className="is-power">Power card - single copy collectible</span>}
                {isAncientCard && <span className="is-ancient">Ancient card - single copy collectible</span>}
              </div>

              <div className="card-reveal-actions">
                <button ref={continueRef} type="button" className="ui-btn primary" onClick={onContinue}>
                  {continueLabel}
                </button>
                {showPlayAgain && (
                  <button type="button" className="ui-btn" onClick={onPlayAgain}>
                    {playAgainLabel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

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

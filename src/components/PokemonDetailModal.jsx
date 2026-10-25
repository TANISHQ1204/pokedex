import React, { useRef, useState } from 'react';
import { SHINY_STAR_LEVEL, unlockedMoveCount, starTierClass } from '../game/cardLevels.js';
import { computePokemonStats, tierName } from '../game/balance.js';
import PokemonImage from './PokemonImage';
import StarMeter from './StarMeter';
import learnsets from '../data/learnsets.json' with { type: 'json' };
import useDialogFocus from '../hooks/useDialogFocus';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const CARD_TYPE_CHIP = {
  normal: { label: 'NORMAL', color: '#7dd3fc', bg: 'rgba(56, 189, 248, 0.14)' },
  power: { label: 'POWER', color: '#f9a8d4', bg: 'rgba(236, 72, 153, 0.18)' },
  ancient: { label: 'ANCIENT', color: '#d6bc8a', bg: 'rgba(184, 154, 108, 0.18)' },
};

const STAT_ROWS = [
  { label: 'HP', key: 'hp', max: 250, color: '#22c55e' },
  { label: 'ATK', key: 'attack', max: 190, color: '#ef4444' },
  { label: 'DEF', key: 'defense', max: 230, color: '#3b82f6' },
  { label: 'SP.ATK', key: 'specialAttack', max: 194, color: '#a855f7' },
  { label: 'SP.DEF', key: 'specialDefense', max: 230, color: '#06b6d4' },
  { label: 'SPD', key: 'speed', max: 200, color: '#eab308' },
];

export default function PokemonDetailModal({
  pokemon,
  entry = null,
  cardType = 'normal',
  onClose,
}) {
  const isOwned = Boolean(entry);
  const starLevel = entry?.star_level || 0;
  const [previewShiny, setPreviewShiny] = useState(isOwned && (entry?.is_shiny || starLevel >= SHINY_STAR_LEVEL));
  const dialogRef = useRef(null);

  useDialogFocus(dialogRef, { onEscape: onClose });

  if (!pokemon) return null;

  const chip = CARD_TYPE_CHIP[cardType] || CARD_TYPE_CHIP.normal;
  const isForm = pokemon.kind === 'form' || Number(pokemon.id) >= 10001;
  const loreStats =
    computePokemonStats(pokemon, { isShiny: Boolean(previewShiny && isOwned) }) || pokemon.stats;
  const learnset = (learnsets || {})[pokemon.id] || (learnsets || {})[String(pokemon.id)] || null;
  const isNormalOwned = isOwned && cardType === 'normal';
  const unlockedCount = isNormalOwned && learnset ? unlockedMoveCount(starLevel) : (learnset?.length ?? pokemon.moves?.length ?? 4);
  const displayMoves = learnset || pokemon.moves || [];
  const displayName = isOwned ? formatTitle(pokemon.name) : 'Unknown Pokemon';
  const isShinyActive = Boolean(previewShiny && isOwned);

  return (
    <div className="modal-overlay ui-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-content pokemon-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pokemon-detail-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header detail-modal-head">
          <div className="detail-modal-identity">
            <div className="detail-modal-id-row">
              <span className="modal-dex-id">
                #{String(pokemon.dexNo || pokemon.id).padStart(4, '0')}
                {isForm && pokemon.label && <span className="form-badge-mark"> + {pokemon.label}</span>}
              </span>
              {cardType !== 'normal' && (
                <span className="detail-card-type" style={{ color: chip.color, background: chip.bg }}>
                  {chip.label}
                </span>
              )}
            </div>
            <h2 className="modal-title" id="pokemon-detail-title">{displayName}</h2>
            <div className="detail-type-row">
              {pokemon.types.map((t) => (
                <span key={t} className={`pokemon-type-badge type-${t}`}>{t}</span>
              ))}
              <span className={`detail-evolution-chip ${pokemon.isFinalEvolution ? 'is-final' : ''}`}>
                {pokemon.isFinalEvolution ? 'Final evolution' : 'Can evolve'}
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close Pokemon details">
            &times;
          </button>
        </div>

        <div className="modal-body detail-modal-body">
          <div className="modal-left detail-art-column">
            <div className={`modal-image-card detail-image-card ${isOwned && cardType === 'normal' ? starTierClass(starLevel) : ''}`}>
              <PokemonImage
                pokemon={pokemon}
                isShiny={isShinyActive}
                alt=""
                className={isOwned ? '' : 'modal-silhouette'}
              />
            </div>

            {isOwned && (
              <div className="detail-preview-toggle" role="group" aria-label="Sprite preview">
                <button
                  type="button"
                  className={`preview-toggle-btn ${!previewShiny ? 'active' : ''}`}
                  onClick={() => setPreviewShiny(false)}
                  aria-pressed={!previewShiny}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`preview-toggle-btn ${previewShiny ? 'active' : ''}`}
                  onClick={() => setPreviewShiny(true)}
                  aria-pressed={previewShiny}
                >
                  Shiny
                </button>
              </div>
            )}

            <div className="modal-status-box detail-status-box">
              {isOwned ? (
                cardType === 'power' ? (
                  <>
                    <div className="detail-special-label is-power">Power card</div>
                    <small>Single copy collectible</small>
                  </>
                ) : cardType === 'ancient' ? (
                  <>
                    <div className="detail-special-label is-ancient">Ancient card</div>
                    <small>Single copy collectible</small>
                  </>
                ) : (
                  <>
                    <StarMeter starLevel={entry.star_level} size="lg" />
                    <div className="detail-ownership-copy">
                      {entry.dupes_collected || 0} duplicate{entry.dupes_collected === 1 ? '' : 's'} collected
                    </div>
                    {!entry.is_shiny && starLevel >= SHINY_STAR_LEVEL && (
                      <div className="detail-shiny-unlocked">Shiny unlocked</div>
                    )}
                  </>
                )
              ) : (
                <div className="detail-unowned">
                  Not in your collection yet. Win battles or clear arcade runs to unlock it.
                </div>
              )}
            </div>
          </div>

          <div className="modal-right detail-info-column">
            <section className="detail-section" aria-labelledby="detail-stats-title">
              <div className="detail-section-head">
                <div>
                  <span className="ui-field-label">Battle stats</span>
                  <h3 id="detail-stats-title">{tierName(loreStats.tier)} tier</h3>
                </div>
                {isShinyActive && <span className="ui-badge is-gold">Shiny +12%</span>}
              </div>
              <div className="stat-bars-container">
                {STAT_ROWS.map((stat) => {
                  const value = loreStats[stat.key];
                  return (
                    <div key={stat.label} className="stat-row">
                      <span className="stat-label">{stat.label}</span>
                      <span className="stat-val stat-number-condensed">{value}</span>
                      <div className="stat-bar-outer">
                        <div
                          className="stat-bar-inner"
                          style={{
                            width: `${Math.min(100, (value / stat.max) * 100)}%`,
                            backgroundColor: stat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="detail-section" aria-labelledby="detail-moves-title">
              <div className="detail-section-head">
                <div>
                  <span className="ui-field-label">Battle moveset</span>
                  <h3 id="detail-moves-title">
                    {isNormalOwned && learnset ? `${unlockedCount} of ${learnset.length} unlocked` : 'Available moves'}
                  </h3>
                </div>
              </div>
              <div className="modal-moves-grid">
                {displayMoves.slice(0, unlockedCount).map((move, index) => (
                  <div key={`${move.name}-${index}`} className="modal-move-card detail-move-card">
                    <div className="detail-move-head">
                      <span>{move.name}</span>
                      <span className={`pokemon-type-badge type-${move.type}`}>{move.type}</span>
                    </div>
                    <div className="detail-move-meta">
                      <span>{move.category}</span>
                      <span>Power {move.power || '--'}</span>
                      <span>PP {move.pp}/{move.maxPp}</span>
                    </div>
                    <p>{move.effect}</p>
                  </div>
                ))}
              </div>
            </section>

            {learnset && (
              <section className="detail-section" aria-labelledby="detail-learnset-title">
                <div className="detail-section-head">
                  <div>
                    <span className="ui-field-label">Learnset progression</span>
                    <h3 id="detail-learnset-title">Move unlocks by star level</h3>
                  </div>
                </div>
                <div className="modal-moves-grid">
                  {learnset.map((move, index) => {
                    const isUnlocked = index < unlockedCount;
                    const requiredStar = index >= 4 ? index - 2 : 1;
                    return (
                      <div
                        key={`${move.name}-${index}`}
                        className={`modal-move-card detail-move-card ${isUnlocked ? '' : 'modal-move-locked'}`}
                      >
                        <div className="detail-move-head">
                          <span>{isUnlocked ? '' : 'Locked - '}{move.name}</span>
                          <span className={`pokemon-type-badge type-${move.type}`}>{move.type}</span>
                        </div>
                        <div className="detail-move-meta">
                          <span>{move.category}</span>
                          <span>Power {move.power || '--'}</span>
                          <span>PP {move.pp}/{move.maxPp}</span>
                        </div>
                        <p>{isUnlocked ? move.effect : `Unlocks at star ${requiredStar}`}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

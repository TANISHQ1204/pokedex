import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import useDialogFocus from '../hooks/useDialogFocus';
import { getBadgeStatus } from '../game/badges';
import badgesList from '../data/badges.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { GymBadgeIcon } from '../components/icons/GameIcons';
import PokemonDetailModal from '../components/PokemonDetailModal';
import StarMeter from '../components/StarMeter';
import { SHINY_STAR_LEVEL, starTierClass } from '../game/cardLevels.js';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const BADGE_COLOR_MAP = {
  badge_kanto: '#ef4444',
  badge_johto: '#3b82f6',
  badge_hoenn: '#22c55e',
  badge_sinnoh: '#06b6d4',
  badge_unova: '#eab308',
  badge_kalos: '#ec4899',
  badge_alola: '#f97316',
  badge_galar: '#a855f7',
  badge_paldea: '#14b8a6',
  badge_boulder: '#854d0e',
  badge_cascade: '#0284c7',
  badge_thunder: '#ca8a04',
  badge_rainbow: '#15803d',
  badge_soul: '#7e22ce',
  badge_marsh: '#be185d',
  badge_volcano: '#b91c1c',
  badge_earth: '#4d7c0f',
};

const REGIONAL_PREFIXES = [
  'badge_kanto',
  'badge_johto',
  'badge_hoenn',
  'badge_sinnoh',
  'badge_unova',
  'badge_kalos',
  'badge_alola',
  'badge_galar',
  'badge_paldea',
];

export default function Badges() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [sectionFilter, setSectionFilter] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const badgeDialogRef = useRef(null);

  useDialogFocus(badgeDialogRef, {
    active: Boolean(selectedBadge),
    onEscape: () => setSelectedBadge(null),
  });

  const pokemonMap = useMemo(() => {
    const map = new Map();
    pokemonList.forEach((p) => map.set(p.id, p));
    return map;
  }, []);

  const loadCollection = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadError('');
      const data = await getUserCollection(user.id);
      const map = new Map();
      data.forEach((entry) => {
        map.set(Number(entry.pokemon_id), entry);
      });
      setCollectionMap(map);
    } catch (err) {
      console.error('Failed to load user collection:', err.message);
      setLoadError('We could not load your badge case. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const evaluatedBadges = useMemo(() => {
    return badgesList.map((badge) => {
      const status = getBadgeStatus(badge, collectionMap);
      const isRegional = REGIONAL_PREFIXES.some((prefix) => badge.id.startsWith(prefix));
      const isMaster = badge.id.startsWith('badge_master_') || badge.id === 'badge_shiny_master';

      return {
        ...badge,
        status,
        type: isRegional ? 'regional' : isMaster ? 'master' : 'gym',
        gemColor: BADGE_COLOR_MAP[badge.id] || '#f59e0b',
      };
    });
  }, [collectionMap]);

  const summary = useMemo(() => {
    let unlocked = 0;
    evaluatedBadges.forEach((badge) => {
      if (badge.status.isUnlocked) unlocked++;
    });
    return {
      unlocked,
      total: evaluatedBadges.length,
      percentage: evaluatedBadges.length > 0 ? Math.round((unlocked / evaluatedBadges.length) * 100) : 0,
    };
  }, [evaluatedBadges]);

  const filteredBadges = useMemo(() => {
    if (sectionFilter === 'all') return evaluatedBadges;
    return evaluatedBadges.filter((badge) => badge.type === sectionFilter);
  }, [evaluatedBadges, sectionFilter]);

  return (
    <div className="page-container home-page batch-page badges-page">
      <section className="ui-page-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow"><GymBadgeIcon size={18} color="#fbbf24" /> League Badge Case</span>
          <h1>Collect the league.</h1>
          <p>
            Complete regional dexes, curated gym sets, and master challenges to earn all {badgesList.length} badge case collectibles.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> {summary.unlocked} earned</span>
            <span>{summary.total - summary.unlocked} remaining</span>
            <span>{summary.percentage}% complete</span>
          </div>
        </div>

        <div className="ui-hero-stat-card">
          <span className="ui-stat-eyebrow">Badges collected</span>
          <strong>{summary.unlocked}/{summary.total}</strong>
          <div className="ui-progress is-gold" aria-hidden="true">
            <span style={{ width: `${summary.percentage}%` }} />
          </div>
          <small>{summary.percentage}% of the league badge case</small>
        </div>
      </section>

      <section className="ui-panel badge-browser" aria-labelledby="badge-browser-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Badge case</span>
            <h2 id="badge-browser-title">Official league display</h2>
            <p>Regional champion badges and classic gym challenges.</p>
          </div>
          <span className="ui-badge">{filteredBadges.length} badges</span>
        </div>

        <div className="gen-shortcuts" role="group" aria-label="Badge categories">
          {[
            { label: 'All Badges', value: 'all', count: evaluatedBadges.length },
            { label: 'Regional Champion', value: 'regional', count: evaluatedBadges.filter((b) => b.type === 'regional').length },
            { label: 'Classic Gym', value: 'gym', count: evaluatedBadges.filter((b) => b.type === 'gym').length },
            { label: 'Master Sets', value: 'master', count: evaluatedBadges.filter((b) => b.type === 'master').length },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`gen-badge-btn ${sectionFilter === tab.value ? 'active' : ''}`}
              onClick={() => setSectionFilter(tab.value)}
              aria-pressed={sectionFilter === tab.value}
            >
              <span className="gen-badge-title">{tab.label}</span>
              <span className="gen-badge-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="ui-state" role="status">
            <span className="ui-spinner" aria-hidden="true" />
            <h3>Opening the badge case</h3>
            <p>Checking your regional and gym set progress...</p>
          </div>
        ) : loadError ? (
          <div className="ui-state is-error" role="alert">
            <GymBadgeIcon size={34} />
            <h3>Badge case unavailable</h3>
            <p>{loadError}</p>
            <button type="button" className="ui-btn primary" onClick={loadCollection}>Try again</button>
          </div>
        ) : filteredBadges.length === 0 ? (
          <div className="ui-state">
            <GymBadgeIcon size={34} isUnlocked={false} />
            <h3>No badges in this category</h3>
            <p>Switch back to all badges to browse the full case.</p>
            <button type="button" className="ui-btn" onClick={() => setSectionFilter('all')}>View all badges</button>
          </div>
        ) : (
          <div className="badge-case-wrapper">
            <div className="badge-case-title-row">
              <span>Official Pokemon League display case</span>
              <span>{summary.unlocked} earned</span>
            </div>

            <div className="badge-case-grid">
              {filteredBadges.map((badge) => {
                const { status } = badge;
                const isUnlocked = status.isUnlocked;

                return (
                  <button
                    key={badge.id}
                    type="button"
                    className={`badge-case-slot ${isUnlocked ? 'unlocked' : 'locked'}`}
                    onClick={() => setSelectedBadge(badge)}
                    aria-label={`${badge.name}, ${isUnlocked ? 'earned' : `${status.progressPercent}% complete`}`}
                  >
                    <span className="badge-slot-icon-wrapper">
                      <GymBadgeIcon size={36} color={badge.gemColor} isUnlocked={isUnlocked} />
                    </span>

                    <span className="badge-slot-title">{badge.name}</span>
                    <span className="badge-slot-region">{badge.region}</span>

                    {isUnlocked ? (
                      <span className="badge-earned-tag">Earned</span>
                    ) : (
                      <span className="badge-progress-box">
                        <span className="badge-progress-text">
                          {status.ownedCount}/{status.totalCount} ({status.progressPercent}%)
                        </span>
                        <span className="ui-progress is-compact" aria-hidden="true">
                          <span style={{ width: `${status.progressPercent}%` }} />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {selectedBadge && (
        <div className="modal-overlay ui-modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div
            ref={badgeDialogRef}
            className="modal-content collection-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="badge-detail-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header detail-modal-head">
              <div className="detail-modal-identity">
                <div className="detail-modal-id-row">
                  <GymBadgeIcon size={34} color={selectedBadge.gemColor} isUnlocked={selectedBadge.status.isUnlocked} />
                  <span className="modal-dex-id">{selectedBadge.region}</span>
                </div>
                <h2 className="modal-title" id="badge-detail-title">{selectedBadge.name}</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedBadge(null)}
                aria-label="Close badge details"
              >
                &times;
              </button>
            </div>

            <div className="collection-progress-card detail-progress-card">
              <p className="detail-badge-description">{selectedBadge.description}</p>
              <div className="detail-progress-head">
                <span>
                  Set completion: <strong>{selectedBadge.status.ownedCount} / {selectedBadge.status.totalCount}</strong>
                </span>
                <strong className={selectedBadge.status.isUnlocked ? 'is-success' : ''}>
                  {selectedBadge.status.isUnlocked ? 'Earned' : `${selectedBadge.status.progressPercent}%`}
                </strong>
              </div>
              <div className="ui-progress is-gold" aria-hidden="true">
                <span style={{ width: `${selectedBadge.status.progressPercent}%` }} />
              </div>
            </div>

            <div className="ui-section-head detail-grid-head">
              <div>
                <span className="ui-field-label">Included Pokemon</span>
                <h3>Set roster</h3>
              </div>
              <span className="ui-badge">{selectedBadge.pokemonIds.length} cards</span>
            </div>

            <div className="collection-grid detail-card-grid">
              {selectedBadge.pokemonIds.map((id) => {
                const pokemon = pokemonMap.get(id);
                if (!pokemon) return null;

                const entry = collectionMap.get(id);
                const isOwned = Boolean(entry);
                const starLevel = entry?.star_level || 0;
                const isShiny = entry?.is_shiny || starLevel >= SHINY_STAR_LEVEL;
                const spriteSrc = isOwned ? (isShiny ? pokemon.sprites.shiny : pokemon.sprites.normal) : pokemon.sprites.normal;

                return (
                  <button
                    key={pokemon.id}
                    type="button"
                    className={`collection-card ${isOwned ? `owned ${starTierClass(starLevel)}` : 'unowned star-tier-0'}`}
                    onClick={() => setSelectedPokemon(pokemon)}
                    aria-label={isOwned ? `${formatTitle(pokemon.name)}, star level ${starLevel}` : `${formatTitle(pokemon.name)}, unowned`}
                  >
                    <span className="card-top-id">#{String(pokemon.id).padStart(4, '0')}</span>
                    <span className="card-image-wrapper">
                      <img src={spriteSrc} alt="" className={isOwned ? '' : 'card-silhouette'} loading="lazy" />
                    </span>
                    <span className="card-info">
                      <span className="card-name">{isOwned ? formatTitle(pokemon.name) : '???'}</span>
                      {isOwned ? (
                        <StarMeter starLevel={starLevel} size="compact" showCount={false} />
                      ) : (
                        <span className="unowned-badge">Unowned</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedPokemon && (
        <PokemonDetailModal
          pokemon={selectedPokemon}
          entry={collectionMap.get(selectedPokemon.id) || null}
          cardType="normal"
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}

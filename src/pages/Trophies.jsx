import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import useDialogFocus from '../hooks/useDialogFocus';
import { getTrophyTier } from '../game/trophies';
import collectionsList from '../data/collections.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { TrophyIcon } from '../components/icons/GameIcons';
import PokemonDetailModal from '../components/PokemonDetailModal';
import StarMeter from '../components/StarMeter';
import { SHINY_STAR_LEVEL, starTierClass } from '../game/cardLevels.js';

const COLLECTIONS_PER_PAGE = 24;

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const TIER_SUMMARY = [
  { key: 'master', label: 'Master' },
  { key: 'diamond', label: 'Diamond' },
  { key: 'platinum', label: 'Platinum' },
  { key: 'gold', label: 'Gold' },
  { key: 'silver', label: 'Silver' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'locked', label: 'Locked' },
];

export default function Trophies() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const collectionDialogRef = useRef(null);

  useDialogFocus(collectionDialogRef, {
    active: Boolean(selectedCollection),
    onEscape: () => setSelectedCollection(null),
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
      setLoadError('We could not load your trophy progress. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const collectionsWithTrophies = useMemo(() => {
    return collectionsList.map((col) => {
      const trophyInfo = getTrophyTier(col, collectionMap);
      return {
        ...col,
        trophyInfo,
      };
    });
  }, [collectionMap]);

  const summary = useMemo(() => {
    let platinum = 0;
    let diamond = 0;
    let master = 0;
    let gold = 0;
    let silver = 0;
    let bronze = 0;
    let locked = 0;

    collectionsWithTrophies.forEach((col) => {
      const tier = col.trophyInfo.tier;
      if (tier === 'master') master++;
      else if (tier === 'diamond') diamond++;
      else if (tier === 'platinum') platinum++;
      else if (tier === 'gold') gold++;
      else if (tier === 'silver') silver++;
      else if (tier === 'bronze') bronze++;
      else locked++;
    });

    return { master, diamond, platinum, gold, silver, bronze, locked, total: collectionsWithTrophies.length };
  }, [collectionsWithTrophies]);

  const unlockedCount = summary.total - summary.locked;
  const completionPercentage = summary.total > 0 ? Math.round((unlockedCount / summary.total) * 100) : 0;

  const filteredCollections = useMemo(() => {
    let result = collectionsWithTrophies;

    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }

    if (statusFilter === 'unlocked') {
      result = result.filter((c) => c.trophyInfo.tier !== 'locked');
    } else if (statusFilter === 'locked') {
      result = result.filter((c) => c.trophyInfo.tier === 'locked');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    return result;
  }, [collectionsWithTrophies, categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / COLLECTIONS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCollections = useMemo(() => {
    const start = (validCurrentPage - 1) * COLLECTIONS_PER_PAGE;
    return filteredCollections.slice(start, start + COLLECTIONS_PER_PAGE);
  }, [filteredCollections, validCurrentPage]);

  const hasActiveFilters = categoryFilter !== 'all' || statusFilter !== 'all' || Boolean(searchQuery.trim());
  const resetFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="page-container home-page batch-page trophies-page">
      <section className="ui-page-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow"><TrophyIcon size={18} /> Trophy Hall</span>
          <h1>Complete sets. Raise trophies.</h1>
          <p>
            Fill every collection to unlock its trophy, then star up the cards to climb from Bronze to Master.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> {unlockedCount} unlocked</span>
            <span>{summary.total} collections</span>
            <span>{summary.master + summary.diamond} top-tier trophies</span>
          </div>
        </div>

        <div className="ui-hero-stat-card">
          <span className="ui-stat-eyebrow">Trophy completion</span>
          <strong>{completionPercentage}%</strong>
          <div className="ui-progress is-gold" aria-hidden="true">
            <span style={{ width: `${completionPercentage}%` }} />
          </div>
          <small>{unlockedCount} of {summary.total} collections unlocked</small>
        </div>
      </section>

      <section className="ui-panel trophy-summary-panel" aria-labelledby="trophy-summary-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Trophy cabinet</span>
            <h2 id="trophy-summary-title">Tiers at a glance</h2>
            <p>Complete the set, then keep starring cards to upgrade the trophy.</p>
          </div>
        </div>
        <div className="trophy-summary-bar">
          {TIER_SUMMARY.map((tier) => (
            <div key={tier.key} className={`trophy-summary-pill ${tier.key}`}>
              <TrophyIcon size={18} tier={tier.key} />
              <span>{tier.label}</span>
              <strong>{summary[tier.key]}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="ui-panel trophy-browser" aria-labelledby="trophy-browser-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Collections</span>
            <h2 id="trophy-browser-title">Find a collection to finish</h2>
            <p>Browse by category, unlock status, or search by name.</p>
          </div>
          <span className="ui-badge">{filteredCollections.length} results</span>
        </div>

        <div className="gen-shortcuts" role="group" aria-label="Collection categories">
          {[
            { label: 'All Collections', value: 'all' },
            { label: 'Type Masters', value: 'type' },
            { label: 'Rarity & BST', value: 'rarity' },
            { label: 'Evolution Families', value: 'family' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`gen-badge-btn ${categoryFilter === tab.value ? 'active' : ''}`}
              onClick={() => setCategoryFilter(tab.value)}
              aria-pressed={categoryFilter === tab.value}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ui-toolbar">
          <label className="ui-field ui-search-field">
            <span className="ui-field-label">Search</span>
            <input
              type="search"
              className="search-input"
              placeholder="Search collections by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Status</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All trophy statuses</option>
              <option value="unlocked">Unlocked trophies</option>
              <option value="locked">In progress / locked</option>
            </select>
          </label>
        </div>

        <div className="ui-result-bar">
          <span aria-live="polite">Showing {filteredCollections.length} collections</span>
          <div className="ui-result-actions">
            {totalPages > 1 && <span>Page {validCurrentPage} of {totalPages}</span>}
            {hasActiveFilters && (
              <button type="button" className="ui-text-btn" onClick={resetFilters}>Clear filters</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="ui-state" role="status">
            <span className="ui-spinner" aria-hidden="true" />
            <h3>Loading trophy data</h3>
            <p>Checking every collection against your cards...</p>
          </div>
        ) : loadError ? (
          <div className="ui-state is-error" role="alert">
            <TrophyIcon size={34} />
            <h3>Trophy progress unavailable</h3>
            <p>{loadError}</p>
            <button type="button" className="ui-btn primary" onClick={loadCollection}>Try again</button>
          </div>
        ) : paginatedCollections.length === 0 ? (
          <div className="ui-state">
            <TrophyIcon size={34} tier="locked" />
            <h3>No collections match</h3>
            <p>Try a different search or clear your filters.</p>
            <button type="button" className="ui-btn" onClick={resetFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="trophies-grid">
            {paginatedCollections.map((col) => {
              const { trophyInfo } = col;
              const { progress } = trophyInfo;

              return (
                <button
                  key={col.id}
                  type="button"
                  className={`trophy-card ${trophyInfo.tier}`}
                  onClick={() => setSelectedCollection(col)}
                  aria-label={`${col.name}, ${trophyInfo.tierName} trophy, ${progress.progressPercent}% complete`}
                >
                  <div className="trophy-card-header">
                    <span className={`trophy-category-tag ${col.category}`}>{col.category.toUpperCase()}</span>
                    <span className="trophy-icon-badge" style={{ color: trophyInfo.color }}>
                      <TrophyIcon size={20} tier={trophyInfo.tier} />
                      {trophyInfo.tierName}
                    </span>
                  </div>

                  <h3 className="trophy-card-title">{col.name}</h3>

                  <div className="trophy-card-stats">
                    <span>{progress.ownedCount} / {progress.totalCount} cards</span>
                    {progress.ownedCount > 0 && <span>Avg star {progress.avgStarLevel}</span>}
                  </div>

                  <div className="ui-progress trophy-progress" aria-hidden="true">
                    <span style={{ width: `${progress.progressPercent}%` }} />
                  </div>
                  <div className="trophy-card-percent">{progress.progressPercent}% complete</div>
                </button>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="page-btn"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &laquo; Prev
            </button>
            <span className="ui-page-count">Page {validCurrentPage} of {totalPages}</span>
            <button
              type="button"
              className="page-btn"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next &raquo;
            </button>
          </div>
        )}
      </section>

      {selectedCollection && (
        <div className="modal-overlay ui-modal-overlay" onClick={() => setSelectedCollection(null)}>
          <div
            ref={collectionDialogRef}
            className="modal-content collection-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-detail-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header detail-modal-head">
              <div>
                <div className="detail-modal-id-row">
                  <span className={`trophy-category-tag ${selectedCollection.category}`}>
                    {selectedCollection.category.toUpperCase()}
                  </span>
                  <span className="detail-trophy-tier" style={{ color: selectedCollection.trophyInfo.color }}>
                    <TrophyIcon size={20} tier={selectedCollection.trophyInfo.tier} />
                    {selectedCollection.trophyInfo.tierName}
                  </span>
                </div>
                <h2 className="modal-title" id="collection-detail-title">{selectedCollection.name}</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedCollection(null)}
                aria-label="Close collection details"
              >
                &times;
              </button>
            </div>

            <div className="collection-progress-card detail-progress-card">
              <div className="detail-progress-head">
                <span>
                  Collection progress: <strong>{selectedCollection.trophyInfo.progress.ownedCount} / {selectedCollection.trophyInfo.progress.totalCount}</strong>
                </span>
                <strong>{selectedCollection.trophyInfo.progress.progressPercent}%</strong>
              </div>
              <div className="ui-progress" aria-hidden="true">
                <span style={{ width: `${selectedCollection.trophyInfo.progress.progressPercent}%` }} />
              </div>
              {selectedCollection.trophyInfo.progress.ownedCount > 0 && (
                <small>Average star level of owned members: {selectedCollection.trophyInfo.progress.avgStarLevel}</small>
              )}
            </div>

            <div className="ui-section-head detail-grid-head">
              <div>
                <span className="ui-field-label">Included Pokemon</span>
                <h3>Set roster</h3>
              </div>
              <span className="ui-badge">{selectedCollection.pokemonIds.length} cards</span>
            </div>

            <div className="collection-grid detail-card-grid">
              {selectedCollection.pokemonIds.map((id) => {
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

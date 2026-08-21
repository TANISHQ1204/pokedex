import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import { getTrophyTier } from '../game/trophies';
import collectionsList from '../data/collections.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { TrophyIcon, SparkleStarIcon } from '../components/icons/GameIcons';

const COLLECTIONS_PER_PAGE = 24;

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Trophies() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'type' | 'rarity' | 'family'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  // Map pokemonList by ID for fast lookup in modal grid
  const pokemonMap = useMemo(() => {
    const map = new Map();
    pokemonList.forEach((p) => map.set(p.id, p));
    return map;
  }, []);

  // Fetch collection from Supabase
  useEffect(() => {
    async function loadCollection() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const data = await getUserCollection(user.id);
        const map = new Map();
        data.forEach((entry) => {
          map.set(Number(entry.pokemon_id), entry);
        });
        setCollectionMap(map);
      } catch (err) {
        console.error('Failed to load user collection:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollection();
  }, [user]);

  // Compute trophies info for all collections
  const collectionsWithTrophies = useMemo(() => {
    return collectionsList.map((col) => {
      const trophyInfo = getTrophyTier(col, collectionMap);
      return {
        ...col,
        trophyInfo,
      };
    });
  }, [collectionMap]);

  // Global trophy summary stats
  const summary = useMemo(() => {
    let gold = 0;
    let silver = 0;
    let bronze = 0;
    let locked = 0;

    collectionsWithTrophies.forEach((col) => {
      const tier = col.trophyInfo.tier;
      if (tier === 'gold') gold++;
      else if (tier === 'silver') silver++;
      else if (tier === 'bronze') bronze++;
      else locked++;
    });

    return { gold, silver, bronze, locked, total: collectionsWithTrophies.length };
  }, [collectionsWithTrophies]);

  // Filter & Search logic
  const filteredCollections = useMemo(() => {
    let result = collectionsWithTrophies;

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'unlocked') {
      result = result.filter((c) => c.trophyInfo.tier !== 'locked');
    } else if (statusFilter === 'locked') {
      result = result.filter((c) => c.trophyInfo.tier === 'locked');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    return result;
  }, [collectionsWithTrophies, categoryFilter, statusFilter, searchQuery]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / COLLECTIONS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCollections = useMemo(() => {
    const start = (validCurrentPage - 1) * COLLECTIONS_PER_PAGE;
    return filteredCollections.slice(start, start + COLLECTIONS_PER_PAGE);
  }, [filteredCollections, validCurrentPage]);

  return (
    <div className="page-container">
      {/* HEADER & TROPHY SUMMARY BADGES */}
      <div className="collection-header">
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.75rem' }}>Pokédex Trophy Hall</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Complete 100% of a collection to unlock cosmetic trophies (Bronze, Silver, Gold)!
          </p>
        </div>

        {/* Summary Badges Grid */}
        <div className="trophy-summary-bar">
          <div className="trophy-summary-pill gold">
            <TrophyIcon size={18} tier="gold" />
            <span>Gold: {summary.gold}</span>
          </div>
          <div className="trophy-summary-pill silver">
            <TrophyIcon size={18} tier="silver" />
            <span>Silver: {summary.silver}</span>
          </div>
          <div className="trophy-summary-pill bronze">
            <TrophyIcon size={18} tier="bronze" />
            <span>Bronze: {summary.bronze}</span>
          </div>
          <div className="trophy-summary-pill locked">
            <TrophyIcon size={18} tier="locked" />
            <span>Locked: {summary.locked}</span>
          </div>
        </div>
      </div>

      {/* CATEGORY SELECTOR TABS */}
      <div className="gen-shortcuts">
        {[
          { label: 'All Collections', value: 'all' },
          { label: 'Type Masters (18)', value: 'type' },
          { label: 'Rarity & BST Tiers', value: 'rarity' },
          { label: 'Evolution Line Families', value: 'family' },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`gen-badge-btn ${categoryFilter === tab.value ? 'active' : ''}`}
            onClick={() => setCategoryFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="collection-filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search collections by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Trophy Statuses</option>
          <option value="unlocked">Unlocked Trophies Only</option>
          <option value="locked">In Progress / Locked Only</option>
        </select>
      </div>

      {/* LIST SUMMARY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        <span>Showing {filteredCollections.length} collections</span>
        {totalPages > 1 && (
          <span>
            Page {validCurrentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* COLLECTIONS GRID */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading Trophy Data...
        </div>
      ) : paginatedCollections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No collections match your filter criteria.
        </div>
      ) : (
        <div className="trophies-grid">
          {paginatedCollections.map((col) => {
            const { trophyInfo } = col;
            const { progress } = trophyInfo;

            return (
              <div
                key={col.id}
                className={`trophy-card ${trophyInfo.tier}`}
                onClick={() => setSelectedCollection(col)}
              >
                <div className="trophy-card-header">
                  <span className={`trophy-category-tag ${col.category}`}>{col.category.toUpperCase()}</span>
                  <span className="trophy-icon-badge" style={{ color: trophyInfo.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrophyIcon size={20} tier={trophyInfo.tier} />
                    {trophyInfo.tierName}
                  </span>
                </div>

                <h3 className="trophy-card-title">{col.name}</h3>

                <div className="trophy-card-stats">
                  <span>Progress: {progress.ownedCount} / {progress.totalCount} ({progress.progressPercent}%)</span>
                  {progress.ownedCount > 0 && (
                    <span>Avg ⭐ {progress.avgStarLevel}</span>
                  )}
                </div>

                <div className="hp-bar-outer" style={{ height: '8px', marginTop: '0.4rem' }}>
                  <div
                    className={`hp-bar-inner ${progress.isComplete ? 'hp-green' : 'hp-yellow'}`}
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="page-btn"
            disabled={validCurrentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            &laquo; Prev
          </button>
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Page {validCurrentPage} of {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={validCurrentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next &raquo;
          </button>
        </div>
      )}

      {/* COLLECTION DETAILS MODAL */}
      {selectedCollection && (
        <div className="modal-overlay" onClick={() => setSelectedCollection(null)}>
          <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span className={`trophy-category-tag ${selectedCollection.category}`}>
                    {selectedCollection.category.toUpperCase()}
                  </span>
                  <span style={{ color: selectedCollection.trophyInfo.color, fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrophyIcon size={20} tier={selectedCollection.trophyInfo.tier} />
                    {selectedCollection.trophyInfo.tierName}
                  </span>
                </div>
                <h2 className="modal-title">{selectedCollection.name}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCollection(null)}>
                &times;
              </button>
            </div>

            {/* Modal Progress Info */}
            <div className="collection-progress-card" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span>
                  Collection Progress: <strong>{selectedCollection.trophyInfo.progress.ownedCount} / {selectedCollection.trophyInfo.progress.totalCount}</strong> Pokémon
                </span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                  {selectedCollection.trophyInfo.progress.progressPercent}%
                </span>
              </div>
              <div className="hp-bar-outer" style={{ height: '10px' }}>
                <div
                  className="hp-bar-inner hp-green"
                  style={{ width: `${selectedCollection.trophyInfo.progress.progressPercent}%` }}
                />
              </div>
              {selectedCollection.trophyInfo.progress.ownedCount > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem', textAlign: 'right' }}>
                  Average Star Level of Owned Members: <strong>{selectedCollection.trophyInfo.progress.avgStarLevel} ⭐</strong>
                </div>
              )}
            </div>

            {/* Collection Pokémon Grid */}
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc' }}>Included Pokémon</h4>
            <div className="collection-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {selectedCollection.pokemonIds.map((id) => {
                const p = pokemonMap.get(id);
                if (!p) return null;

                const entry = collectionMap.get(id);
                const isOwned = Boolean(entry);
                const starLevel = entry?.star_level || 0;
                const isShiny = entry?.is_shiny || starLevel >= 5;
                const spriteSrc = isOwned ? (isShiny ? p.sprites.shiny : p.sprites.normal) : p.sprites.normal;

                return (
                  <div
                    key={p.id}
                    className={`collection-card ${isOwned ? 'owned' : 'unowned'}`}
                    onClick={() => setSelectedPokemon(p)}
                  >
                    <div className="card-top-id">#{String(p.id).padStart(4, '0')}</div>
                    <div className="card-image-wrapper">
                      <img
                        src={spriteSrc}
                        alt={isOwned ? p.name : '???'}
                        className={isOwned ? '' : 'card-silhouette'}
                      />
                    </div>
                    <div className="card-info">
                      <div className="card-name">{isOwned ? formatTitle(p.name) : '???'}</div>
                      {isOwned ? (
                        <div className="star-rating">
                          {'★'.repeat(starLevel)}
                          {'☆'.repeat(5 - starLevel)}
                        </div>
                      ) : (
                        <div className="unowned-badge">Unowned</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* POKEMON SECONDARY DETAIL MODAL */}
      {selectedPokemon && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setSelectedPokemon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-dex-id">#{String(selectedPokemon.id).padStart(4, '0')}</span>
                <h2 className="modal-title">
                  {collectionMap.has(selectedPokemon.id) ? formatTitle(selectedPokemon.name) : '???'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedPokemon(null)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-left">
                <div className="modal-image-card">
                  <img
                    src={
                      collectionMap.has(selectedPokemon.id) &&
                      (collectionMap.get(selectedPokemon.id)?.is_shiny ||
                        collectionMap.get(selectedPokemon.id)?.star_level >= 5)
                        ? selectedPokemon.sprites.shiny
                        : selectedPokemon.sprites.normal
                    }
                    alt={selectedPokemon.name}
                    className={collectionMap.has(selectedPokemon.id) ? '' : 'modal-silhouette'}
                  />
                </div>
                <div className="modal-status-box">
                  {collectionMap.has(selectedPokemon.id) ? (
                    <div className="modal-star-row">
                      {'★'.repeat(collectionMap.get(selectedPokemon.id).star_level)}
                      {'☆'.repeat(5 - collectionMap.get(selectedPokemon.id).star_level)}
                    </div>
                  ) : (
                    <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.875rem' }}>
                      Unowned
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-right">
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    TYPES
                  </span>
                  <div>
                    {selectedPokemon.types.map((t) => (
                      <span key={t} className={`pokemon-type-badge type-${t}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                    BASE STATS
                  </span>
                  <div className="stat-bars-container">
                    {[
                      { label: 'HP', val: selectedPokemon.stats.hp, max: 250, color: '#22c55e' },
                      { label: 'ATK', val: selectedPokemon.stats.attack, max: 190, color: '#ef4444' },
                      { label: 'DEF', val: selectedPokemon.stats.defense, max: 230, color: '#3b82f6' },
                      { label: 'SP.ATK', val: selectedPokemon.stats.specialAttack, max: 194, color: '#a855f7' },
                      { label: 'SP.DEF', val: selectedPokemon.stats.specialDefense, max: 230, color: '#06b6d4' },
                      { label: 'SPD', val: selectedPokemon.stats.speed, max: 200, color: '#eab308' },
                    ].map((stat) => (
                      <div key={stat.label} className="stat-row">
                        <span className="stat-label">{stat.label}</span>
                        <span className="stat-val">{stat.val}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

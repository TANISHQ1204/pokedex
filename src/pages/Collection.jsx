import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import { fullPokemonList, displayName, isAltForm } from '../utils/pokemonCatalog.js';
import { glowBaseFor } from '../utils/glow';
import PokemonDetailModal from '../components/PokemonDetailModal';
import StarMeter from '../components/StarMeter';
import { CardsIcon, SparkleStarIcon } from '../components/icons/GameIcons';
import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL, STAR_TIERS, STAR_TIER_COLORS, starTierClass } from '../game/cardLevels.js';

const ITEMS_PER_PAGE = 48;

const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];

const GENERATIONS = [
  { label: 'All Gens', value: 'all', range: [1, 1025] },
  { label: 'Gen 1 (Kanto)', value: '1', range: [1, 151] },
  { label: 'Gen 2 (Johto)', value: '2', range: [152, 251] },
  { label: 'Gen 3 (Hoenn)', value: '3', range: [252, 386] },
  { label: 'Gen 4 (Sinnoh)', value: '4', range: [387, 493] },
  { label: 'Gen 5 (Unova)', value: '5', range: [494, 649] },
  { label: 'Gen 6 (Kalos)', value: '6', range: [650, 721] },
  { label: 'Gen 7 (Alola)', value: '7', range: [722, 809] },
  { label: 'Gen 8 (Galar)', value: '8', range: [810, 905] },
  { label: 'Gen 9 (Paldea)', value: '9', range: [906, 1025] },
  { label: 'Alt Forms', value: 'forms', range: [10001, 11000] },
];

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function rarityClassFor(starLevel, isShiny) {
  if (isShiny || starLevel >= MAX_STAR_LEVEL) return 'rarity-card-shiny';
  if (starLevel >= 9) return 'rarity-card-aurora';
  if (starLevel === 8) return 'rarity-card-prismatic';
  if (starLevel === 7) return 'rarity-card-golden';
  if (starLevel === 6) return 'rarity-card-radiant';
  if (starLevel === 5) return 'rarity-card-super';
  if (starLevel === 4) return 'rarity-card-legendary';
  if (starLevel === 3) return 'rarity-card-rare';
  if (starLevel === 2) return 'rarity-card-uncommon';
  return 'rarity-card-common';
}

export default function Collection() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [genFilter, setGenFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id-asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedPokemon, setSelectedPokemon] = useState(null);

  const loadCollection = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadError('');
      const data = await getUserCollection(user.id);
      const normalMap = new Map();

      data.forEach((entry) => {
        const pId = Number(entry.pokemon_id);
        if (!entry.is_power_card && !entry.is_ancient_card) {
          normalMap.set(pId, entry);
        }
      });

      setCollectionMap(normalMap);
    } catch (err) {
      console.error('Failed to load collection:', err.message);
      setLoadError('We could not load your collection. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const filteredPokemon = useMemo(() => {
    let result = fullPokemonList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || displayName(p).toLowerCase().includes(q) || String(p.id).includes(q)
      );
    }

    if (ownershipFilter === 'owned') {
      result = result.filter((p) => collectionMap.has(p.id));
    } else if (ownershipFilter === 'unowned') {
      result = result.filter((p) => !collectionMap.has(p.id));
    }

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.types.includes(typeFilter.toLowerCase()));
    }

    if (genFilter !== 'all') {
      const genObj = GENERATIONS.find((g) => g.value === genFilter);
      if (genObj) {
        const [minId, maxId] = genObj.range;
        result = result.filter((p) => p.id >= minId && p.id <= maxId);
      }
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'id-asc') return a.id - b.id;
      if (sortBy === 'id-desc') return b.id - a.id;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'star-desc') {
        const starA = collectionMap.get(a.id)?.star_level || 0;
        const starB = collectionMap.get(b.id)?.star_level || 0;
        return starB - starA || a.id - b.id;
      }
      return 0;
    });
  }, [searchQuery, ownershipFilter, typeFilter, genFilter, sortBy, collectionMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ownershipFilter, typeFilter, genFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPokemon.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPokemon = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredPokemon.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPokemon, validCurrentPage]);

  const ownedCount = collectionMap.size;
  const totalCount = fullPokemonList.length;
  const completionPercentage = Math.round((ownedCount / totalCount) * 100);
  const hasActiveFilters =
    Boolean(searchQuery.trim()) || ownershipFilter !== 'all' || typeFilter !== 'all' || genFilter !== 'all';

  const tierStats = STAR_TIERS.map((t) => {
    const count = [...collectionMap.values()].filter(
      (e) => Math.max(1, Math.min(MAX_STAR_LEVEL, Number(e.star_level) || 1)) === t.star
    ).length;
    return { ...t, count };
  });
  const maxTierCount = Math.max(1, ...tierStats.map((t) => t.count));
  const ownedTierCards = tierStats.reduce((acc, t) => acc + t.count, 0);
  const maxLevelCount = tierStats.find((t) => t.star === MAX_STAR_LEVEL)?.count || 0;

  const perGenStats = GENERATIONS.map((gen) => {
    const [minId, maxId] = gen.range;
    const total = fullPokemonList.filter((p) => p.id >= minId && p.id <= maxId).length;
    const owned = [...collectionMap.keys()].filter((id) => id >= minId && id <= maxId).length;
    return { ...gen, total, owned };
  });

  const resetFilters = () => {
    setSearchQuery('');
    setOwnershipFilter('all');
    setTypeFilter('all');
    setGenFilter('all');
    setSortBy('id-asc');
  };

  return (
    <div className="page-container home-page batch-page collection-page">
      <section className="ui-page-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow"><CardsIcon size={18} /> National Dex</span>
          <h1>Your card collection</h1>
          <p>
            Track every catch, follow your star upgrades, and complete all nine generations plus alternate forms.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> {ownedCount} owned</span>
            <span>{totalCount - ownedCount} still to find</span>
            <span>{maxLevelCount} fully maxed</span>
          </div>
        </div>

        <div className="ui-hero-stat-card">
          <span className="ui-stat-eyebrow">Dex completion</span>
          <strong>{completionPercentage}%</strong>
          <div className="ui-progress" aria-hidden="true">
            <span style={{ width: `${completionPercentage}%` }} />
          </div>
          <small>{ownedCount} of {totalCount} cards collected</small>
        </div>
      </section>

      <section className="ui-panel collection-tier-panel" aria-labelledby="collection-levels-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Progression</span>
            <h2 id="collection-levels-title">Card levels</h2>
            <p>{ownedTierCards} of {ownedCount} owned cards are leveled up.</p>
          </div>
          <span className="ui-badge is-gold"><SparkleStarIcon size={14} /> {maxLevelCount} maxed</span>
        </div>

        <div className="tier-bar">
          {tierStats.map((t) => (
            <div
              key={t.star}
              className="tier-segment"
              style={{
                flexGrow: t.count || 1,
                minWidth: t.count > 0 ? Math.max(8, (t.count / maxTierCount) * 24) : 0,
                background: `linear-gradient(180deg, ${STAR_TIER_COLORS[t.star]}cc, ${STAR_TIER_COLORS[t.star]}99)`,
                borderColor: STAR_TIER_COLORS[t.star],
                opacity: t.count > 0 ? 1 : 0.25,
              }}
              title={`${t.label}: ${t.count} card${t.count === 1 ? '' : 's'}`}
            >
              {t.count > 0 && (
                <span className={`tier-segment-count ${starTierClass(t.star)}`}>
                  <span className="tier-segment-star">*</span>
                  <em>{t.count}</em>
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="tier-legend">
          {tierStats.map((t) => (
            <span
              key={t.star}
              className={`tier-legend-item ${starTierClass(t.star)}`}
              title={`${t.label} - ${t.count} card${t.count === 1 ? '' : 's'}`}
            >
              <i />
              *<b>{t.star}</b> {t.label} <em>({t.count})</em>
            </span>
          ))}
        </div>
      </section>

      <section className="ui-panel collection-browser" aria-labelledby="collection-browser-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Card browser</span>
            <h2 id="collection-browser-title">Find your next favorite</h2>
            <p>Filter by ownership, type, generation, or star level.</p>
          </div>
          <span className="ui-badge">{filteredPokemon.length} results</span>
        </div>

        <div className="gen-shortcuts" role="group" aria-label="Generation filters">
          {perGenStats.map((gen) => (
            <button
              key={gen.value}
              type="button"
              className={`gen-badge-btn ${genFilter === gen.value ? 'active' : ''}`}
              onClick={() => setGenFilter(gen.value)}
              aria-pressed={genFilter === gen.value}
              title={`${gen.label} - ${gen.owned}/${gen.total} collected`}
            >
              <span className="gen-badge-title">
                {gen.label === 'All Gens' ? gen.label : gen.label.replace(/ \(.*\)/, '')}
              </span>
              <span className="gen-badge-count">{gen.owned}/{gen.total}</span>
            </button>
          ))}
        </div>

        <div className="ui-toolbar">
          <label className="ui-field ui-search-field">
            <span className="ui-field-label">Search</span>
            <input
              type="search"
              className="search-input"
              placeholder="Search by name or Dex ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Ownership</span>
            <select
              className="filter-select"
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
            >
              <option value="all">All ownership</option>
              <option value="owned">Owned cards</option>
              <option value="unowned">Unowned only</option>
            </select>
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Type</span>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Sort</span>
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="id-asc">Dex ID: Low to high</option>
              <option value="id-desc">Dex ID: High to low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="star-desc">Star level: High to low</option>
            </select>
          </label>
        </div>

        <div className="ui-result-bar">
          <span aria-live="polite">
            Showing {filteredPokemon.length} Pokemon
            {hasActiveFilters ? ' matching your filters' : ''}
          </span>
          <div className="ui-result-actions">
            {totalPages > 1 && <span>Page {validCurrentPage} of {totalPages}</span>}
            {hasActiveFilters && (
              <button type="button" className="ui-text-btn" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="ui-state" role="status">
            <span className="ui-spinner" aria-hidden="true" />
            <h3>Loading your collection</h3>
            <p>Syncing your cards and star levels...</p>
          </div>
        ) : loadError ? (
          <div className="ui-state is-error" role="alert">
            <CardsIcon size={34} />
            <h3>Collection unavailable</h3>
            <p>{loadError}</p>
            <button type="button" className="ui-btn primary" onClick={loadCollection}>Try again</button>
          </div>
        ) : paginatedPokemon.length === 0 ? (
          <div className="ui-state">
            <CardsIcon size={34} />
            <h3>No cards match</h3>
            <p>Try a different search or clear a filter to see more of the dex.</p>
            <button type="button" className="ui-btn" onClick={resetFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="collection-grid">
            {paginatedPokemon.map((p) => {
              const entry = collectionMap.get(p.id);
              const isOwned = Boolean(entry);
              const starLevel = entry?.star_level || 0;
              const isShiny = entry?.is_shiny || starLevel >= SHINY_STAR_LEVEL;
              const spriteSrc = isOwned ? (isShiny ? p.sprites.shiny : p.sprites.normal) : p.sprites.normal;
              const tierClass = isOwned ? starTierClass(starLevel) : 'star-tier-0';
              const rarityClass = isOwned ? rarityClassFor(starLevel, isShiny) : '';
              const holoClass = isOwned && (isShiny || starLevel >= 18) ? 'holo-shimmer-effect' : '';

              return (
                <button
                  key={p.id}
                  type="button"
                  className={`collection-card tcg-card ${tierClass} ${rarityClass} ${holoClass} ${isOwned ? 'owned' : 'unowned'}`.trim()}
                  onClick={() => setSelectedPokemon(p)}
                  data-glow
                  style={{ '--base': glowBaseFor(p.types) }}
                  aria-label={isOwned ? `${displayName(p)}, star level ${starLevel}${isShiny ? ', shiny' : ''}` : `${formatTitle(p.name)}, unowned`}
                >
                  <span className="card-glow-overlay" data-glow aria-hidden="true" />
                  <span className="card-top-id stat-number-condensed">
                    #{String(p.id).padStart(4, '0')}
                    {isAltForm(p) && <span className="form-badge-mark"> + {p.generation ? `Gen ${p.generation}` : 'Form'}</span>}
                  </span>

                  <span className="card-image-wrapper">
                    <img
                      src={spriteSrc}
                      alt=""
                      className={isOwned ? '' : 'card-silhouette'}
                      loading="lazy"
                    />
                    {isShiny && isOwned && <span className="shiny-sparkle-badge"><SparkleStarIcon size={11} /> Shiny</span>}
                  </span>

                  <span className="card-info">
                    <span className="card-name">{isOwned ? displayName(p) : '???'}</span>

                    {isOwned ? (
                      <>
                        <StarMeter starLevel={starLevel} size="compact" />
                        <span className="card-types">
                          {p.types.map((t) => (
                            <span key={t} className={`pokemon-type-badge type-${t}`}>
                              {t}
                            </span>
                          ))}
                        </span>
                      </>
                    ) : (
                      <span className="unowned-badge">Unowned</span>
                    )}
                  </span>
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

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import PowerCard from '../components/PowerCard';
import PowerCardRevealModal from '../components/PowerCardRevealModal';

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
];

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Collection() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [powerCollectionMap, setPowerCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // View mode: 'dex' (default grid) or 'power-cards' (collectibles gallery)
  const viewMode = searchParams.get('view') === 'power-cards' ? 'power-cards' : 'dex';
  const setViewMode = (mode) => {
    if (mode === 'power-cards') {
      setSearchParams({ view: 'power-cards' });
    } else {
      setSearchParams({});
    }
  };

  // Filters & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // 'all' | 'owned' | 'unowned' | 'power_cards'
  const [typeFilter, setTypeFilter] = useState('all');
  const [genFilter, setGenFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id-asc'); // 'id-asc' | 'id-desc' | 'name-asc' | 'star-desc'
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal state
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [previewShiny, setPreviewShiny] = useState(false);
  const [viewPowerCardInModal, setViewPowerCardInModal] = useState(false);

  // Power Cards Gallery state
  const [cardShinyMap, setCardShinyMap] = useState({});
  const [revealPokemon, setRevealPokemon] = useState(null);
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [powerSearch, setPowerSearch] = useState('');
  const [powerTypeFilter, setPowerTypeFilter] = useState('all');
  const [powerPage, setPowerPage] = useState(1);
  const POWER_PER_PAGE = 24;

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
        const normalMap = new Map();
        const powerMap = new Map();

        data.forEach((entry) => {
          const pId = Number(entry.pokemon_id);
          if (entry.is_power_card) {
            powerMap.set(pId, entry);
          } else {
            normalMap.set(pId, entry);
          }
        });

        setCollectionMap(normalMap);
        setPowerCollectionMap(powerMap);
      } catch (err) {
        console.error('Failed to load collection:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollection();
  }, [user]);

  // Filter & Sort logic
  const filteredPokemon = useMemo(() => {
    let result = pokemonList;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q));
    }

    // Ownership filter
    if (ownershipFilter === 'owned') {
      result = result.filter((p) => collectionMap.has(p.id) || powerCollectionMap.has(p.id));
    } else if (ownershipFilter === 'unowned') {
      result = result.filter((p) => !collectionMap.has(p.id) && !powerCollectionMap.has(p.id));
    } else if (ownershipFilter === 'power_cards') {
      result = result.filter((p) => powerCollectionMap.has(p.id));
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.types.includes(typeFilter.toLowerCase()));
    }

    // Generation filter
    if (genFilter !== 'all') {
      const genObj = GENERATIONS.find((g) => g.value === genFilter);
      if (genObj) {
        const [minId, maxId] = genObj.range;
        result = result.filter((p) => p.id >= minId && p.id <= maxId);
      }
    }

    // Sorting
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
  }, [searchQuery, ownershipFilter, typeFilter, genFilter, sortBy, collectionMap, powerCollectionMap]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ownershipFilter, typeFilter, genFilter, sortBy]);

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(filteredPokemon.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPokemon = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredPokemon.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPokemon, validCurrentPage]);

  // Statistics
  const ownedCount = new Set([...collectionMap.keys(), ...powerCollectionMap.keys()]).size;
  const totalCount = pokemonList.length;
  const completionPercentage = Math.round((ownedCount / totalCount) * 100);

  // Power cards collectibles: one entry per type for dual-type Pokémon
  const ownedPowerCardCount = powerCollectionMap.size;

  const allPowerCardEntries = useMemo(() => {
    let entries = [];
    pokemonList.forEach((p) => {
      if (p.types.length > 1) {
        // Dual-type: one card per type
        p.types.forEach((type) => {
          entries.push({ pokemon: p, themeType: type, key: `${p.id}-${type}` });
        });
      } else {
        entries.push({ pokemon: p, themeType: p.types[0], key: `${p.id}-${p.types[0]}` });
      }
    });

    // Search filter
    if (powerSearch.trim()) {
      const q = powerSearch.toLowerCase().trim();
      entries = entries.filter(
        (e) => e.pokemon.name.toLowerCase().includes(q) || String(e.pokemon.id).includes(q)
      );
    }

    // Type filter
    if (powerTypeFilter !== 'all') {
      entries = entries.filter((e) => e.themeType === powerTypeFilter);
    }

    return entries;
  }, [powerSearch, powerTypeFilter]);

  // Reset power page on filter change
  useEffect(() => {
    setPowerPage(1);
  }, [powerSearch, powerTypeFilter]);

  const powerTotalPages = Math.max(1, Math.ceil(allPowerCardEntries.length / POWER_PER_PAGE));
  const powerValidPage = Math.min(powerPage, powerTotalPages);
  const paginatedPowerCards = useMemo(() => {
    const start = (powerValidPage - 1) * POWER_PER_PAGE;
    return allPowerCardEntries.slice(start, start + POWER_PER_PAGE);
  }, [allPowerCardEntries, powerValidPage]);

  const handleCardClick = (p) => {
    setSelectedPokemon(p);
    const entry = collectionMap.get(p.id);
    setPreviewShiny(entry?.is_shiny || (entry?.star_level >= 5));
    setViewPowerCardInModal(powerCollectionMap.has(p.id) && !collectionMap.has(p.id));
  };

  const toggleCardShiny = (id) => {
    setCardShinyMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCardShiny = (pokemonId) => {
    return cardShinyMap[pokemonId] ?? false;
  };

  const handleOpenReveal = (pokemon) => {
    setRevealPokemon(pokemon);
    setIsRevealOpen(true);
  };

  return (
    <div className="page-container">
      {/* HEADER & COLLECTION PROGRESS BAR */}
      <div className="collection-header">
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.75rem' }}>National Dex Card Collection</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Collect and upgrade cards across all 9 Pokémon Generations!
          </p>
        </div>

        <div className="collection-progress-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Dex Completion</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>
              {ownedCount} / {totalCount} ({completionPercentage}%)
            </span>
          </div>
          <div className="hp-bar-outer" style={{ height: '10px' }}>
            <div
              className="hp-bar-inner hp-green"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE: Dex Collection / Power Cards */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        margin: '0 0 1.25rem 0',
        padding: '6px',
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
      }}>
        <button
          onClick={() => setViewMode('dex')}
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            background: viewMode === 'dex' ? 'linear-gradient(90deg, #6366f1, #4f46e5)' : 'transparent',
            color: viewMode === 'dex' ? '#ffffff' : '#94a3b8',
            boxShadow: viewMode === 'dex' ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          🗂️ Dex Collection
        </button>
        <button
          onClick={() => setViewMode('power-cards')}
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '0.9rem',
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            background: viewMode === 'power-cards' ? 'linear-gradient(90deg, #ec4899, #8b5cf6)' : 'transparent',
            color: viewMode === 'power-cards' ? '#ffffff' : '#94a3b8',
            boxShadow: viewMode === 'power-cards' ? '0 4px 16px rgba(236, 72, 153, 0.4)' : 'none',
          }}
        >
          ⚡ Power Cards ({ownedPowerCardCount})
        </button>
      </div>

      {/* ========================================= */}
      {/* VIEW: POWER CARDS COLLECTIBLES GALLERY    */}
      {/* ========================================= */}
      {viewMode === 'power-cards' ? (
        <div>
          {/* Power Cards Summary */}
          <div style={{
            textAlign: 'center',
            padding: '20px',
            marginBottom: '20px',
            background: 'radial-gradient(circle at 50% 0%, rgba(236, 72, 153, 0.12), transparent 70%)',
            borderRadius: '20px',
            border: '1px solid rgba(236, 72, 153, 0.2)',
          }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px', fontFamily: "'Rajdhani', sans-serif" }}>ULTRA RARE COLLECTIBLES</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
              ⚡ {ownedPowerCardCount} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '1rem' }}>/ {totalCount} Power Cards Collected</span>
            </div>
            <div className="hp-bar-outer" style={{ height: '8px', maxWidth: '400px', margin: '10px auto 0' }}>
              <div
                className="hp-bar-inner"
                style={{
                  width: `${Math.round((ownedPowerCardCount / totalCount) * 100)}%`,
                  background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                }}
              />
            </div>
          </div>

          {/* Power Cards Search & Type Filter */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            padding: '14px 16px',
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
          }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search Power Cards by name or ID..."
              value={powerSearch}
              onChange={(e) => setPowerSearch(e.target.value)}
              style={{ flex: '1 1 220px', minWidth: '180px' }}
            />
            <select
              className="filter-select"
              value={powerTypeFilter}
              onChange={(e) => setPowerTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Results count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>
              Showing {allPowerCardEntries.length} cards {powerSearch || powerTypeFilter !== 'all' ? '(Filtered)' : ''}
              {' · '}<span style={{ color: '#ec4899' }}>{allPowerCardEntries.filter(e => powerCollectionMap.has(e.pokemon.id)).length} owned</span>
            </span>
            {powerTotalPages > 1 && <span>Page {powerValidPage} of {powerTotalPages}</span>}
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              Loading Power Cards...
            </div>
          ) : allPowerCardEntries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#64748b',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>No cards match your search.</div>
            </div>
          ) : (
            <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '36px 24px',
              justifyItems: 'center',
            }}>
              {paginatedPowerCards.map(({ pokemon, themeType, key }) => {
                const isOwned = powerCollectionMap.has(pokemon.id);
                const shiny = isCardShiny(pokemon.id);
                const typeName = themeType.charAt(0).toUpperCase() + themeType.slice(1);

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      background: isOwned ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0.3)',
                      padding: '16px',
                      borderRadius: '24px',
                      border: isOwned ? '1px solid rgba(236, 72, 153, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'border-color 0.3s, box-shadow 0.3s',
                      opacity: isOwned ? 1 : 0.55,
                      filter: isOwned ? 'none' : 'grayscale(0.6)',
                      position: 'relative',
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                      <span style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: isOwned ? '#ffd700' : '#475569',
                        letterSpacing: '1px',
                      }}>
                        #{String(pokemon.id).padStart(4, '0')} — {isOwned ? formatTitle(pokemon.name) : '???'}
                        {pokemon.types.length > 1 && (
                          <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: isOwned ? '#a78bfa' : '#475569', fontWeight: 600 }}>({typeName})</span>
                        )}
                      </span>
                      {isOwned && (
                        <button
                          onClick={() => toggleCardShiny(pokemon.id)}
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: shiny ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'rgba(30, 41, 59, 0.8)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {shiny ? '✨ Shiny' : '⭐ Normal'}
                        </button>
                      )}
                    </div>

                    {/* Power Card or Locked Placeholder */}
                    {isOwned ? (
                      <PowerCard pokemon={pokemon} isShiny={shiny} enableTilt={true} themeTypeOverride={themeType} />
                    ) : (
                      <div style={{
                        width: '280px',
                        height: '420px',
                        borderRadius: '18px',
                        background: 'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
                        border: '2px dashed rgba(100, 116, 139, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* Faint silhouette */}
                        <img
                          src={pokemon.sprites.normal}
                          alt=""
                          style={{
                            width: '120px',
                            height: '120px',
                            filter: 'brightness(0) invert(0.15)',
                            opacity: 0.3,
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                        <div style={{
                          fontSize: '0.75rem',
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 800,
                          letterSpacing: '2px',
                          color: '#475569',
                          textAlign: 'center',
                        }}>
                          🔒 LOCKED
                        </div>
                        <div style={{
                          fontSize: '0.65rem',
                          color: '#334155',
                          textAlign: 'center',
                          padding: '0 20px',
                        }}>
                          Win battles to unlock
                        </div>
                        {/* Type badge on placeholder */}
                        <span className={`pokemon-type-badge type-${themeType}`} style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          fontSize: '0.65rem',
                          padding: '2px 8px',
                          opacity: 0.5,
                        }}>
                          {themeType}
                        </span>
                      </div>
                    )}

                    {/* Footer actions for owned cards */}
                    {isOwned && (
                      <button
                        onClick={() => handleOpenReveal(pokemon)}
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '8px 18px',
                          borderRadius: '10px',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#c7d2fe',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.5)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.2)'}
                      >
                        ▶ Play Reveal
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Power Cards Pagination */}
            {powerTotalPages > 1 && (
              <div className="pagination-bar">
                <button
                  className="page-btn"
                  disabled={powerValidPage === 1}
                  onClick={() => setPowerPage((p) => Math.max(1, p - 1))}
                >
                  &laquo; Prev
                </button>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  Page {powerValidPage} of {powerTotalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={powerValidPage === powerTotalPages}
                  onClick={() => setPowerPage((p) => Math.min(powerTotalPages, p + 1))}
                >
                  Next &raquo;
                </button>
              </div>
            )}
            </>
          )}

          {/* Reveal Modal */}
          <PowerCardRevealModal
            pokemon={revealPokemon}
            isOpen={isRevealOpen}
            onClose={() => setIsRevealOpen(false)}
            initialShiny={revealPokemon ? isCardShiny(revealPokemon.id) : false}
          />
        </div>
      ) : (
      /* ========================================= */
      /* VIEW: DEX COLLECTION (existing grid)      */
      /* ========================================= */
      <>

      {/* QUICK GENERATION SHORTCUT BUTTONS */}
      <div className="gen-shortcuts">
        {GENERATIONS.map((gen) => (
          <button
            key={gen.value}
            className={`gen-badge-btn ${genFilter === gen.value ? 'active' : ''}`}
            onClick={() => setGenFilter(gen.value)}
          >
            {gen.label}
          </button>
        ))}
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="collection-filter-bar">
        {/* Search Input */}
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or Dex ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Ownership Filter */}
        <select
          className="filter-select"
          value={ownershipFilter}
          onChange={(e) => setOwnershipFilter(e.target.value)}
        >
          <option value="all">All Ownership Status</option>
          <option value="owned">Owned Cards</option>
          <option value="power_cards">⚡ Power Cards Only</option>
          <option value="unowned">Unowned Only</option>
        </select>

        {/* Type Filter */}
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {POKEMON_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Sort By */}
        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="id-asc">Dex ID: Low to High</option>
          <option value="id-desc">Dex ID: High to Low</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="star-desc">Star Level: High to Low</option>
        </select>
      </div>

      {/* FILTER STATUS / COUNT SUMMARY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        <span>
          Showing {filteredPokemon.length} Pokémon {searchQuery || typeFilter !== 'all' || ownershipFilter !== 'all' || genFilter !== 'all' ? '(Filtered)' : ''}
        </span>
        {totalPages > 1 && (
          <span>
            Page {validCurrentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* LOADING SPINNER / GRID */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading Collection Data...
        </div>
      ) : paginatedPokemon.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No Pokémon match your current filter settings.
        </div>
      ) : (
        <div className="collection-grid">
          {paginatedPokemon.map((p) => {
            const entry = collectionMap.get(p.id);
            const hasPowerCard = powerCollectionMap.has(p.id);
            const isOwned = Boolean(entry) || hasPowerCard;
            const starLevel = entry?.star_level || 0;
            const isShiny = entry?.is_shiny || starLevel >= 5;
            const spriteSrc = isOwned ? (isShiny ? p.sprites.shiny : p.sprites.normal) : p.sprites.normal;

            let rarityClass = 'rarity-card-common';
            if (hasPowerCard) rarityClass = 'rarity-card-shiny holo-shimmer-effect';
            else if (starLevel === 2) rarityClass = 'rarity-card-uncommon';
            else if (starLevel === 3) rarityClass = 'rarity-card-rare';
            else if (starLevel === 4) rarityClass = 'rarity-card-legendary';
            else if (starLevel >= 5 || isShiny) rarityClass = 'rarity-card-shiny holo-shimmer-effect';

            return (
              <div
                key={p.id}
                className={`collection-card tcg-card ${isOwned ? rarityClass + ' owned' : 'unowned'}`}
                onClick={() => handleCardClick(p)}
              >
                <div className="card-top-id stat-number-condensed">#{String(p.id).padStart(4, '0')}</div>

                <div className="card-image-wrapper">
                  <img
                    src={spriteSrc}
                    alt={isOwned ? p.name : '???'}
                    className={isOwned ? '' : 'card-silhouette'}
                  />
                  {hasPowerCard && (
                    <div className="shiny-sparkle-badge" style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', color: '#ffffff', fontWeight: 800 }}>
                      ⚡ POWER
                    </div>
                  )}
                  {isShiny && isOwned && !hasPowerCard && <div className="shiny-sparkle-badge">✨ Shiny</div>}
                </div>

                <div className="card-info">
                  <div className="card-name">{isOwned ? formatTitle(p.name) : '???'}</div>

                  {isOwned ? (
                    <>
                      <div className="star-rating">
                        {starLevel > 0 ? (
                          <>
                            {'★'.repeat(starLevel)}
                            {'☆'.repeat(5 - starLevel)}
                          </>
                        ) : (
                          <span style={{ color: '#ec4899', fontWeight: 800, fontSize: '0.75rem' }}>ULTRA TROPHY</span>
                        )}
                      </div>
                      <div className="card-types">
                        {p.types.map((t) => (
                          <span key={t} className={`pokemon-type-badge type-${t}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="unowned-badge">Unowned</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
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

      {/* DETAIL MODAL */}
      {selectedPokemon && (
        <div className="modal-overlay" onClick={() => setSelectedPokemon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <span className="modal-dex-id">#{String(selectedPokemon.id).padStart(4, '0')}</span>
                <h2 className="modal-title">
                  {collectionMap.has(selectedPokemon.id) || powerCollectionMap.has(selectedPokemon.id)
                    ? formatTitle(selectedPokemon.name)
                    : '???'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedPokemon(null)}>
                &times;
              </button>
            </div>

            {/* Power Card View Toggle Bar */}
            {powerCollectionMap.has(selectedPokemon.id) && collectionMap.has(selectedPokemon.id) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  className={`preview-toggle-btn ${!viewPowerCardInModal ? 'active' : ''}`}
                  onClick={() => setViewPowerCardInModal(false)}
                >
                  Standard Card
                </button>
                <button
                  className={`preview-toggle-btn ${viewPowerCardInModal ? 'active' : ''}`}
                  style={viewPowerCardInModal ? { background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', color: '#ffffff', border: 'none' } : {}}
                  onClick={() => setViewPowerCardInModal(true)}
                >
                  ⚡ Power Card
                </button>
              </div>
            )}

            {/* Modal Body */}
            {viewPowerCardInModal ? (
              <div className="modal-body" style={{ flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                <PowerCard pokemon={selectedPokemon} isShiny={previewShiny} />
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    className={`preview-toggle-btn ${!previewShiny ? 'active' : ''}`}
                    onClick={() => setPreviewShiny(false)}
                  >
                    Normal
                  </button>
                  <button
                    className={`preview-toggle-btn ${previewShiny ? 'active' : ''}`}
                    onClick={() => setPreviewShiny(true)}
                  >
                    ✨ Shiny
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body">
                {/* Left Column: Image & Ownership status */}
                <div className="modal-left">
                  <div className="modal-image-card">
                    <img
                      src={
                        previewShiny && (collectionMap.has(selectedPokemon.id) || powerCollectionMap.has(selectedPokemon.id))
                          ? selectedPokemon.sprites.shiny
                          : selectedPokemon.sprites.normal
                      }
                      alt={selectedPokemon.name}
                      className={collectionMap.has(selectedPokemon.id) || powerCollectionMap.has(selectedPokemon.id) ? '' : 'modal-silhouette'}
                    />
                  </div>

                  {(collectionMap.has(selectedPokemon.id) || powerCollectionMap.has(selectedPokemon.id)) && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                      <button
                        className={`preview-toggle-btn ${!previewShiny ? 'active' : ''}`}
                        onClick={() => setPreviewShiny(false)}
                      >
                        Normal
                      </button>
                      <button
                        className={`preview-toggle-btn ${previewShiny ? 'active' : ''}`}
                        onClick={() => setPreviewShiny(true)}
                      >
                        ✨ Shiny
                      </button>
                    </div>
                  )}

                  <div className="modal-status-box">
                    {collectionMap.has(selectedPokemon.id) ? (
                      <>
                        <div className="modal-star-row">
                          {'★'.repeat(collectionMap.get(selectedPokemon.id).star_level)}
                          {'☆'.repeat(5 - collectionMap.get(selectedPokemon.id).star_level)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          Duplicates Collected: {collectionMap.get(selectedPokemon.id).dupes_collected || 0}
                        </div>
                      </>
                    ) : powerCollectionMap.has(selectedPokemon.id) ? (
                      <div style={{ color: '#ec4899', fontWeight: 700, fontSize: '0.875rem' }}>
                        ⚡ Ultra Power Card Owned!
                      </div>
                    ) : (
                      <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.875rem' }}>
                        Not in Collection Yet (Win battles to unlock!)
                      </div>
                    )}
                  </div>
                </div>

              {/* Right Column: Types, Stats & Moveset */}
              <div className="modal-right">
                {/* Types */}
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    TYPES & EVOLUTION
                  </span>
                  <div>
                    {selectedPokemon.types.map((t) => (
                      <span key={t} className={`pokemon-type-badge type-${t}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                        {t}
                      </span>
                    ))}
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: selectedPokemon.isFinalEvolution ? '#065f46' : '#334155',
                        color: selectedPokemon.isFinalEvolution ? '#a7f3d0' : '#cbd5e1',
                        fontWeight: 600,
                      }}
                    >
                      {selectedPokemon.isFinalEvolution ? 'Final Evolution' : 'Can Evolve'}
                    </span>
                  </div>
                </div>

                {/* Base Stats */}
                <div style={{ marginBottom: '1.25rem' }}>
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
                        <span className="stat-val stat-number-condensed">{stat.val}</span>
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

                {/* 4-Move Moveset */}
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                    BATTLE MOVESET
                  </span>
                  <div className="modal-moves-grid">
                    {selectedPokemon.moves?.map((m, mIdx) => (
                      <div key={mIdx} className="modal-move-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{m.name}</span>
                          <span className={`pokemon-type-badge type-${m.type}`}>{m.type}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                          <span>Cat: {m.category}</span> | <span>Pwr: {m.power || '--'}</span> | <span>PP: {m.pp}/{m.maxPp}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          {m.effect}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
    )}
    </div>
  );
}

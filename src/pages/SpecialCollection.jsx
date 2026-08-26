import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import PowerCard from '../components/PowerCard';
import PowerCardRevealModal from '../components/PowerCardRevealModal';

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

const POWER_PER_PAGE = 24;

const SPECIAL_CATEGORIES = [
  {
    id: 'power-cards',
    name: 'Power Cards',
    description: 'Ultra rare cosmetic bonus cards — a 5% bonus drop on battle victory. One copy per Pokemon, no duplicates or star leveling.',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    glowColor: 'rgba(236, 72, 153, 0.15)',
  },
];

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function SpecialCollection() {
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [powerCollectionMap, setPowerCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Power Cards gallery state
  const [revealPokemon, setRevealPokemon] = useState(null);
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [powerSearch, setPowerSearch] = useState('');
  const [powerTypeFilter, setPowerTypeFilter] = useState('all');
  const [powerPage, setPowerPage] = useState(1);

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
        const powerMap = new Map();

        data.forEach((entry) => {
          if (entry.is_power_card) {
            powerMap.set(Number(entry.pokemon_id), entry);
          }
        });

        setPowerCollectionMap(powerMap);
      } catch (err) {
        console.error('Failed to load special collection:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollection();
  }, [user]);

  // Reset power page on filter change
  useEffect(() => {
    setPowerPage(1);
  }, [powerSearch, powerTypeFilter]);

  // Power card entries: one entry per type for dual-type Pokemon
  const allPowerCardEntries = useMemo(() => {
    let entries = [];
    pokemonList.forEach((p) => {
      if (p.types.length > 1) {
        p.types.forEach((type) => {
          entries.push({ pokemon: p, themeType: type, key: `${p.id}-${type}` });
        });
      } else {
        entries.push({ pokemon: p, themeType: p.types[0], key: `${p.id}-${p.types[0]}` });
      }
    });

    if (powerSearch.trim()) {
      const q = powerSearch.toLowerCase().trim();
      entries = entries.filter(
        (e) => e.pokemon.name.toLowerCase().includes(q) || String(e.pokemon.id).includes(q)
      );
    }

    if (powerTypeFilter !== 'all') {
      entries = entries.filter((e) => e.themeType === powerTypeFilter);
    }

    return entries;
  }, [powerSearch, powerTypeFilter]);

  const powerTotalPages = Math.max(1, Math.ceil(allPowerCardEntries.length / POWER_PER_PAGE));
  const powerValidPage = Math.min(powerPage, powerTotalPages);
  const paginatedPowerCards = useMemo(() => {
    const start = (powerValidPage - 1) * POWER_PER_PAGE;
    return allPowerCardEntries.slice(start, start + POWER_PER_PAGE);
  }, [allPowerCardEntries, powerValidPage]);

  const ownedPowerCardCount = powerCollectionMap.size;
  const totalCount = pokemonList.length;

  const handleOpenReveal = (pokemon) => {
    setRevealPokemon(pokemon);
    setIsRevealOpen(true);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setPowerSearch('');
    setPowerTypeFilter('all');
    setPowerPage(1);
  };

  // CATEGORY LIST VIEW
  if (!selectedCategory) {
    return (
      <div className="page-container">
        <div className="collection-header">
          <div>
            <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.75rem' }}>Special Collection</h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              Rare collectible card types beyond the National Dex.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          marginTop: '1.5rem',
        }}>
          {SPECIAL_CATEGORIES.map((cat) => {
            const count = cat.id === 'power-cards' ? ownedPowerCardCount : 0;
            const total = cat.id === 'power-cards' ? totalCount : 0;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${cat.glowColor}, rgba(15, 23, 42, 0.95) 70%)`,
                  border: `1px solid ${cat.borderColor}`,
                  borderRadius: '20px',
                  padding: '28px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '2rem',
                    width: '56px',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    background: cat.gradient,
                    boxShadow: `0 4px 16px ${cat.glowColor}`,
                  }}>
                    {cat.icon}
                  </span>
                  <div>
                    <div style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: '#f8fafc',
                      fontFamily: "'Outfit', sans-serif",
                      textAlign: 'left',
                    }}>
                      {cat.name}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      marginTop: '2px',
                      textAlign: 'left',
                    }}>
                      {count} / {total} Collected
                    </div>
                  </div>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: '#64748b',
                  lineHeight: '1.5',
                  textAlign: 'left',
                }}>
                  {cat.description}
                </p>
                {total > 0 && (
                  <div className="hp-bar-outer" style={{ height: '6px', marginTop: '14px' }}>
                    <div
                      className="hp-bar-inner"
                      style={{
                        width: `${Math.round((count / total) * 100)}%`,
                        background: cat.gradient,
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // POWER CARDS CATEGORY DETAIL VIEW
  if (selectedCategory === 'power-cards') {
    return (
      <div className="page-container">
        {/* Header with back button */}
        <div className="collection-header">
          <div>
            <button
              onClick={handleBackToCategories}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                padding: 0,
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              ← Back to Special Collection
            </button>
            <h1 style={{ margin: '4px 0 0 0', color: '#f8fafc', fontSize: '1.75rem' }}>⚡ Power Cards</h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              Ultra rare cosmetic bonus cards — one copy per Pokemon, no duplicates.
            </p>
          </div>

          <div className="collection-progress-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Power Card Progress</span>
              <span style={{ color: '#ec4899', fontWeight: 700 }}>
                {ownedPowerCardCount} / {totalCount} ({Math.round((ownedPowerCardCount / totalCount) * 100)}%)
              </span>
            </div>
            <div className="hp-bar-outer" style={{ height: '10px' }}>
              <div
                className="hp-bar-inner"
                style={{
                  width: `${Math.round((ownedPowerCardCount / totalCount) * 100)}%`,
                  background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Search & Type Filter */}
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
                  <div style={{ width: '100%', padding: '0 4px' }}>
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
                  </div>

                  {/* Power Card or Locked Placeholder */}
                  {isOwned ? (
                    <PowerCard pokemon={pokemon} enableTilt={true} themeTypeOverride={themeType} />
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
        />
      </div>
    );
  }

  return null;
}

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import PowerCard from '../components/PowerCard';
import PowerCardRevealModal from '../components/PowerCardRevealModal';
import AncientCard from '../components/AncientCard';
import AncientCardRevealModal from '../components/AncientCardRevealModal';

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

const GENERATIONS = [
  { id: 1, name: 'Kanto', min: 1, max: 151 },
  { id: 2, name: 'Johto', min: 152, max: 251 },
  { id: 3, name: 'Hoenn', min: 252, max: 386 },
  { id: 4, name: 'Sinnoh', min: 387, max: 493 },
  { id: 5, name: 'Unova', min: 494, max: 649 },
  { id: 6, name: 'Kalos', min: 650, max: 721 },
  { id: 7, name: 'Alola', min: 722, max: 809 },
  { id: 8, name: 'Galar', min: 810, max: 905 },
  { id: 9, name: 'Paldea', min: 906, max: 1025 },
];

const PER_PAGE = 24;

const SPECIAL_CATEGORIES = [
  {
    id: 'power-cards',
    name: 'Power Cards',
    description: 'Ultra rare cosmetic bonus cards — a 5% drop chance on battle victory. One copy per Pokemon, no duplicates or star leveling.',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    glowColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    id: 'ancient-cards',
    name: 'Ancient Cards',
    description: 'Generation-themed ancient relic cards — a 3% drop chance on battle victory. One copy per Pokemon, themed by the Pokemon\'s home region.',
    icon: '🏛️',
    gradient: 'linear-gradient(135deg, #b89a6c, #8a6a3c)',
    borderColor: 'rgba(184, 154, 108, 0.3)',
    glowColor: 'rgba(184, 154, 108, 0.15)',
  },
];

function formatTitle(str) {
  if (!str) return '';
  return str.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getGeneration(id) {
  for (const gen of GENERATIONS) {
    if (id >= gen.min && id <= gen.max) return gen;
  }
  return GENERATIONS[0];
}

export default function SpecialCollection() {
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [powerCollectionMap, setPowerCollectionMap] = useState(new Map());
  const [ancientCollectionMap, setAncientCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Power Cards gallery state
  const [revealPokemon, setRevealPokemon] = useState(null);
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [revealType, setRevealType] = useState('power');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [genFilter, setGenFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Fetch collection from Supabase
  useEffect(() => {
    async function loadCollection() {
      if (!user) { setIsLoading(false); return; }
      try {
        setIsLoading(true);
        const data = await getUserCollection(user.id);
        const powerMap = new Map();
        const ancientMap = new Map();
        data.forEach((entry) => {
          if (entry.is_power_card) powerMap.set(Number(entry.pokemon_id), entry);
          if (entry.is_ancient_card) ancientMap.set(Number(entry.pokemon_id), entry);
        });
        setPowerCollectionMap(powerMap);
        setAncientCollectionMap(ancientMap);
      } catch (err) {
        console.error('Failed to load special collection:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollection();
  }, [user]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchText, typeFilter, genFilter]);

  // Build gallery entries based on selected category
  const allEntries = useMemo(() => {
    let entries = [];

    if (selectedCategory === 'power-cards') {
      // Dual-type Pokemon get two entries (one per type theme)
      pokemonList.forEach((p) => {
        if (p.types.length > 1) {
          p.types.forEach((type) => {
            entries.push({ pokemon: p, themeType: type, key: `${p.id}-${type}` });
          });
        } else {
          entries.push({ pokemon: p, themeType: p.types[0], key: `${p.id}-${p.types[0]}` });
        }
      });
    } else if (selectedCategory === 'ancient-cards') {
      // One entry per Pokemon, grouped by generation
      pokemonList.forEach((p) => {
        const gen = getGeneration(p.id);
        entries.push({ pokemon: p, gen, key: `${p.id}` });
      });
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      entries = entries.filter((e) => e.pokemon.name.toLowerCase().includes(q) || String(e.pokemon.id).includes(q));
    }

    if (typeFilter !== 'all') {
      if (selectedCategory === 'power-cards') {
        entries = entries.filter((e) => e.themeType === typeFilter);
      } else {
        entries = entries.filter((e) => e.pokemon.types.includes(typeFilter));
      }
    }

    if (genFilter !== 'all' && selectedCategory === 'ancient-cards') {
      entries = entries.filter((e) => e.gen.id === Number(genFilter));
    }

    return entries;
  }, [selectedCategory, searchText, typeFilter, genFilter]);

  const totalPages = Math.max(1, Math.ceil(allEntries.length / PER_PAGE));
  const validPage = Math.min(page, totalPages);
  const paginatedEntries = useMemo(() => {
    const start = (validPage - 1) * PER_PAGE;
    return allEntries.slice(start, start + PER_PAGE);
  }, [allEntries, validPage]);

  const ownedCount = selectedCategory === 'power-cards' ? powerCollectionMap.size : ancientCollectionMap.size;
  const totalCount = pokemonList.length;

  const handleOpenReveal = (pokemon, type) => {
    setRevealPokemon(pokemon);
    setRevealType(type);
    setIsRevealOpen(true);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearchText('');
    setTypeFilter('all');
    setGenFilter('all');
    setPage(1);
  };

  const resetFilters = () => {
    setSearchText('');
    setTypeFilter('all');
    setGenFilter('all');
    setPage(1);
  };

  const isOwned = (pokemonId) => {
    if (selectedCategory === 'power-cards') return powerCollectionMap.has(pokemonId);
    return ancientCollectionMap.has(pokemonId);
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '1.5rem' }}>
          {SPECIAL_CATEGORIES.map((cat) => {
            const count = cat.id === 'power-cards' ? powerCollectionMap.size : ancientCollectionMap.size;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); resetFilters(); }}
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${cat.glowColor}, rgba(15, 23, 42, 0.95) 70%)`,
                  border: `1px solid ${cat.borderColor}`,
                  borderRadius: '20px', padding: '28px 24px', cursor: 'pointer', textAlign: 'left',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  fontFamily: 'inherit', width: '100%',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '2rem', width: '56px', height: '56px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '16px', background: cat.gradient,
                    boxShadow: `0 4px 16px ${cat.glowColor}`,
                  }}>
                    {cat.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', fontFamily: "'Outfit', sans-serif", textAlign: 'left' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', textAlign: 'left' }}>
                      {count} / {totalCount} Collected
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5', textAlign: 'left' }}>
                  {cat.description}
                </p>
                <div className="hp-bar-outer" style={{ height: '6px', marginTop: '14px' }}>
                  <div className="hp-bar-inner" style={{ width: `${Math.round((count / totalCount) * 100)}%`, background: cat.gradient }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // DETAIL VIEW (Power Cards or Ancient Cards)
  const catInfo = SPECIAL_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="page-container">
      <div className="collection-header">
        <div>
          <button
            onClick={handleBackToCategories}
            style={{
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
              fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 600, padding: 0,
              marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            ← Back to Special Collection
          </button>
          <h1 style={{ margin: '4px 0 0 0', color: '#f8fafc', fontSize: '1.75rem' }}>
            {catInfo.icon} {catInfo.name}
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            {selectedCategory === 'power-cards'
              ? 'Ultra rare cosmetic bonus cards — one copy per Pokemon, no duplicates.'
              : 'Generation-themed ancient relic cards — one copy per Pokemon.'}
          </p>
        </div>

        <div className="collection-progress-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{catInfo.name} Progress</span>
            <span style={{ color: selectedCategory === 'power-cards' ? '#ec4899' : '#b89a6c', fontWeight: 700 }}>
              {ownedCount} / {totalCount} ({Math.round((ownedCount / totalCount) * 100)}%)
            </span>
          </div>
          <div className="hp-bar-outer" style={{ height: '10px' }}>
            <div className="hp-bar-inner" style={{ width: `${Math.round((ownedCount / totalCount) * 100)}%`, background: catInfo.gradient }} />
          </div>
        </div>
      </div>

      {/* Search, Type Filter, Gen Filter */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '16px',
        padding: '14px 16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)',
      }}>
        <input
          type="text"
          className="search-input"
          placeholder={`Search ${catInfo.name} by name or ID...`}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: '1 1 220px', minWidth: '180px' }}
        />
        <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {POKEMON_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        {selectedCategory === 'ancient-cards' && (
          <select className="filter-select" value={genFilter} onChange={(e) => setGenFilter(e.target.value)}>
            <option value="all">All Generations</option>
            {GENERATIONS.map((g) => (
              <option key={g.id} value={g.id}>Gen {g.id} — {g.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Results count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
        <span>
          Showing {allEntries.length} cards {searchText || typeFilter !== 'all' || genFilter !== 'all' ? '(Filtered)' : ''}
          {' · '}<span style={{ color: selectedCategory === 'power-cards' ? '#ec4899' : '#b89a6c' }}>
            {allEntries.filter((e) => isOwned(e.pokemon.id)).length} owned
          </span>
        </span>
        {totalPages > 1 && <span>Page {validPage} of {totalPages}</span>}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading {catInfo.name}...</div>
      ) : allEntries.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px', color: '#64748b',
          background: 'rgba(15, 23, 42, 0.5)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)',
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
            {paginatedEntries.map((entry) => {
              const pokemon = entry.pokemon;
              const owned = isOwned(pokemon.id);
              const typeLabel = selectedCategory === 'power-cards'
                ? (entry.themeType.charAt(0).toUpperCase() + entry.themeType.slice(1))
                : `Gen ${entry.gen.id}`;

              return (
                <div
                  key={entry.key}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    background: owned ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0.3)',
                    padding: '16px', borderRadius: '24px',
                    border: owned ? `1px solid ${selectedCategory === 'power-cards' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(184, 154, 108, 0.25)'}` : '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                    opacity: owned ? 1 : 0.55,
                    filter: owned ? 'none' : 'grayscale(0.6)',
                    position: 'relative',
                  }}
                >
                  <div style={{ width: '100%', padding: '0 4px' }}>
                    <span style={{
                      fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: '0.85rem',
                      color: owned ? (selectedCategory === 'power-cards' ? '#ffd700' : '#b89a6c') : '#475569',
                      letterSpacing: '1px',
                    }}>
                      #{String(pokemon.id).padStart(4, '0')} — {owned ? formatTitle(pokemon.name) : '???'}
                      {selectedCategory === 'power-cards' && pokemon.types.length > 1 && (
                        <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: owned ? '#a78bfa' : '#475569', fontWeight: 600 }}>
                          ({typeLabel})
                        </span>
                      )}
                      {selectedCategory === 'ancient-cards' && (
                        <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: owned ? '#b89a6c' : '#475569', fontWeight: 600 }}>
                          ({typeLabel})
                        </span>
                      )}
                    </span>
                  </div>

                  {owned ? (
                    selectedCategory === 'power-cards' ? (
                      <PowerCard pokemon={pokemon} enableTilt={true} themeTypeOverride={entry.themeType} />
                    ) : (
                      <AncientCard pokemon={pokemon} enableTilt={true} />
                    )
                  ) : (
                    <div style={{
                      width: '280px', height: '420px', borderRadius: '18px',
                      background: 'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
                      border: '2px dashed rgba(100, 116, 139, 0.3)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '12px', position: 'relative', overflow: 'hidden',
                    }}>
                      <img src={pokemon.sprites.normal} alt="" style={{ width: '120px', height: '120px', filter: 'brightness(0) invert(0.15)', opacity: 0.3, userSelect: 'none', pointerEvents: 'none' }} />
                      <div style={{ fontSize: '0.75rem', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, letterSpacing: '2px', color: '#475569', textAlign: 'center' }}>
                        🔒 LOCKED
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#334155', textAlign: 'center', padding: '0 20px' }}>
                        Win battles to unlock
                      </div>
                      <span className={`pokemon-type-badge type-${pokemon.types[0]}`} style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.65rem', padding: '2px 8px', opacity: 0.5 }}>
                        {pokemon.types[0]}
                      </span>
                    </div>
                  )}

                  {owned && (
                    <button
                      onClick={() => handleOpenReveal(pokemon, selectedCategory)}
                      style={{
                        fontFamily: "'Outfit', sans-serif", fontSize: '0.8rem', fontWeight: 700,
                        padding: '8px 18px', borderRadius: '10px',
                        border: `1px solid ${selectedCategory === 'power-cards' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(184, 154, 108, 0.4)'}`,
                        background: selectedCategory === 'power-cards' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(184, 154, 108, 0.2)',
                        color: selectedCategory === 'power-cards' ? '#c7d2fe' : '#e8dcc8',
                        cursor: 'pointer', transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.background = selectedCategory === 'power-cards' ? 'rgba(99, 102, 241, 0.5)' : 'rgba(184, 154, 108, 0.5)'}
                      onMouseLeave={(e) => e.target.style.background = selectedCategory === 'power-cards' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(184, 154, 108, 0.2)'}
                    >
                      ▶ Play Reveal
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination-bar">
              <button className="page-btn" disabled={validPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>&laquo; Prev</button>
              <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Page {validPage} of {totalPages}</span>
              <button className="page-btn" disabled={validPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next &raquo;</button>
            </div>
          )}
        </>
      )}

      {/* Reveal Modals */}
      {revealType === 'power-cards' && (
        <PowerCardRevealModal pokemon={revealPokemon} isOpen={isRevealOpen} onClose={() => setIsRevealOpen(false)} />
      )}
      {revealType === 'ancient-cards' && (
        <AncientCardRevealModal pokemon={revealPokemon} isOpen={isRevealOpen} onClose={() => setIsRevealOpen(false)} />
      )}
    </div>
  );
}

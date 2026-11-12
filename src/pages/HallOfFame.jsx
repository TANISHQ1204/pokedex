import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import useDialogFocus from '../hooks/useDialogFocus';
import { buildHallOfFame } from '../game/hallOfFame';
import { AwardEmblemIcon } from '../components/icons/GameIcons';
import PokemonImage from '../components/PokemonImage';
import PokemonDetailModal from '../components/PokemonDetailModal';
import { isNormalRecord } from '../utils/cardTypes';

const INDUCTEES_PER_PAGE = 24;

const GENERATIONS = [
  { id: 'all', label: 'All generations' },
  { id: '1', label: 'Gen I - Kanto' },
  { id: '2', label: 'Gen II - Johto' },
  { id: '3', label: 'Gen III - Hoenn' },
  { id: '4', label: 'Gen IV - Sinnoh' },
  { id: '5', label: 'Gen V - Unova' },
  { id: '6', label: 'Gen VI - Kalos' },
  { id: '7', label: 'Gen VII - Alola' },
  { id: '8', label: 'Gen VIII - Galar' },
  { id: '9', label: 'Gen IX - Paldea' },
];

const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function HonorChip({ honor }) {
  return (
    <span
      className="hof-honor-chip"
      style={{ '--honor-accent': honor.accent }}
      title={`${honor.categoryLabel}: ${honor.name}`}
    >
      {honor.name}
    </span>
  );
}

export default function HallOfFame() {
  const { user } = useAuth();
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [generationFilter, setGenerationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [honorFilter, setHonorFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedInductee, setSelectedInductee] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const inducteeDialogRef = useRef(null);

  useDialogFocus(inducteeDialogRef, {
    active: Boolean(selectedInductee),
    onEscape: () => setSelectedInductee(null),
  });

  const loadCollection = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadError('');
      const data = await getUserCollection(user.id);
      setCollection(data.filter(isNormalRecord));
    } catch (err) {
      console.error('Failed to load Hall of Fame:', err.message);
      setLoadError('We could not load your Hall of Fame. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const hall = useMemo(() => buildHallOfFame({ collection }), [collection]);

  const honorOptions = useMemo(() => {
    const categories = new Map();
    hall.inductees.forEach((inductee) => {
      inductee.honors.forEach((honor) => {
        if (!categories.has(honor.category)) {
          categories.set(honor.category, {
            id: honor.category,
            label: honor.categoryLabel,
            accent: honor.accent,
          });
        }
      });
    });
    return [...categories.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [hall.inductees]);

  const filteredInductees = useMemo(() => {
    let result = hall.inductees;

    if (generationFilter !== 'all') {
      result = result.filter((inductee) => String(inductee.generation) === generationFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((inductee) => inductee.types.includes(typeFilter));
    }

    if (honorFilter !== 'all') {
      result = result.filter((inductee) => (
        inductee.honors.some((honor) => honor.category === honorFilter)
      ));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((inductee) => (
        inductee.name.toLowerCase().includes(query) ||
        inductee.epithet.toLowerCase().includes(query) ||
        inductee.honors.some((honor) => honor.name.toLowerCase().includes(query))
      ));
    }

    const sorted = [...result];
    if (sortOrder === 'oldest') {
      sorted.sort((a, b) => a.inductionNumber - b.inductionNumber);
    } else if (sortOrder === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.inductionNumber - a.inductionNumber);
    }
    return sorted;
  }, [hall.inductees, generationFilter, typeFilter, honorFilter, searchQuery, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [generationFilter, typeFilter, honorFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredInductees.length / INDUCTEES_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInductees = useMemo(() => {
    const start = (validCurrentPage - 1) * INDUCTEES_PER_PAGE;
    return filteredInductees.slice(start, start + INDUCTEES_PER_PAGE);
  }, [filteredInductees, validCurrentPage]);

  const hasActiveFilters =
    generationFilter !== 'all' ||
    typeFilter !== 'all' ||
    honorFilter !== 'all' ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setGenerationFilter('all');
    setTypeFilter('all');
    setHonorFilter('all');
    setSearchQuery('');
    setSortOrder('newest');
  };

  const honorGroups = useMemo(() => {
    if (!selectedInductee) return [];
    const groups = new Map();
    selectedInductee.honors.forEach((honor) => {
      if (!groups.has(honor.category)) {
        groups.set(honor.category, {
          id: honor.category,
          label: honor.categoryLabel,
          accent: honor.accent,
          honors: [],
        });
      }
      groups.get(honor.category).honors.push(honor);
    });
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedInductee]);

  return (
    <div className="page-container home-page batch-page hall-of-fame-page">
      <section className="ui-page-hero hall-of-fame-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow">
            <AwardEmblemIcon size={18} design="crown" color="#fbbf24" /> Hall of Fame
          </span>
          <h1>Where legends are enshrined.</h1>
          <p>
            Reach 20 stars with any card to induct it. Every plaque records its ceremonial epithet,
            region, and the collections that made it legendary.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> {hall.inductedCount} inducted</span>
            <span>{Math.max(hall.catalogCount - hall.inductedCount, 0)} awaiting induction</span>
            <span>{hall.completionPercent}% of the hall complete</span>
          </div>
        </div>

        <div className="ui-hero-stat-card hall-of-fame-stat-card">
          <span className="ui-stat-eyebrow">Hall of Fame inductees</span>
          <strong>{hall.inductedCount}</strong>
          <div className="ui-progress is-gold" aria-hidden="true">
            <span style={{ width: `${hall.completionPercent}%` }} />
          </div>
          <small>{hall.inductedCount} of {hall.catalogCount} cards enshrined</small>
        </div>
      </section>

      <section className="ui-panel hall-of-fame-browser" aria-labelledby="hall-of-fame-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Inductee gallery</span>
            <h2 id="hall-of-fame-title">The permanent collection</h2>
            <p>Every normal card at 20 stars earns a plaque. Alternate forms are inducted separately.</p>
          </div>
          <span className="ui-badge">{filteredInductees.length} inductees</span>
        </div>

        <div className="ui-toolbar hall-of-fame-toolbar">
          <label className="ui-field ui-search-field">
            <span className="ui-field-label">Search</span>
            <input
              type="search"
              className="search-input"
              placeholder="Search names, epithets, or honors..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Generation</span>
            <select
              className="filter-select"
              value={generationFilter}
              onChange={(event) => setGenerationFilter(event.target.value)}
            >
              {GENERATIONS.map((generation) => (
                <option key={generation.id} value={generation.id}>{generation.label}</option>
              ))}
            </select>
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Type</span>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              {TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Honor</span>
            <select
              className="filter-select"
              value={honorFilter}
              onChange={(event) => setHonorFilter(event.target.value)}
              disabled={honorOptions.length === 0}
            >
              <option value="all">All honors</option>
              {honorOptions.map((honor) => (
                <option key={honor.id} value={honor.id}>{honor.label}</option>
              ))}
            </select>
          </label>

          <label className="ui-field">
            <span className="ui-field-label">Sort</span>
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="newest">Newest induction</option>
              <option value="oldest">Oldest induction</option>
              <option value="name">Name A-Z</option>
            </select>
          </label>
        </div>

        <div className="ui-result-bar">
          <span aria-live="polite">Showing {filteredInductees.length} inductees</span>
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
            <h3>Opening the Hall of Fame</h3>
            <p>Checking your 20-star cards and their honors...</p>
          </div>
        ) : loadError ? (
          <div className="ui-state is-error" role="alert">
            <AwardEmblemIcon size={34} design="crown" color="#fbbf24" />
            <h3>Hall of Fame unavailable</h3>
            <p>{loadError}</p>
            <button type="button" className="ui-btn primary" onClick={loadCollection}>Try again</button>
          </div>
        ) : hall.inductedCount === 0 ? (
          <div className="ui-state">
            <AwardEmblemIcon size={34} design="crown" color="#64748b" isUnlocked={false} />
            <h3>No inductees yet</h3>
            <p>Raise any card to 20 stars and its plaque will appear here automatically.</p>
            <Link className="ui-btn primary" to="/collection">Open collection</Link>
          </div>
        ) : paginatedInductees.length === 0 ? (
          <div className="ui-state">
            <AwardEmblemIcon size={34} design="crown" color="#64748b" isUnlocked={false} />
            <h3>No inductees match</h3>
            <p>Try a different search or clear your filters.</p>
            <button type="button" className="ui-btn" onClick={resetFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="hof-grid">
            {paginatedInductees.map((inductee) => (
              <button
                key={inductee.id}
                type="button"
                className="hof-plaque award-themed-card"
                style={{ '--award-accent': inductee.accent }}
                onClick={() => setSelectedInductee(inductee)}
                aria-label={`${inductee.name}, ${inductee.epithet}, inductee number ${inductee.inductionNumber}`}
              >
                <span className="hof-plaque-top">
                  <span className="hof-plaque-seal">
                    <AwardEmblemIcon size={24} design="crown" color="#fbbf24" isUnlocked />
                  </span>
                  <span className="hof-plaque-number">
                    Inductee #{String(inductee.inductionNumber).padStart(3, '0')}
                  </span>
                </span>

                <span className="hof-plaque-portrait">
                  <span className="hof-plaque-spotlight" aria-hidden="true" />
                  <PokemonImage
                    pokemon={inductee.pokemon}
                    isShiny
                    alt=""
                    className="hof-plaque-sprite"
                    loading="lazy"
                  />
                  <span className="hof-plaque-star">20★</span>
                </span>

                <span className="hof-plaque-body">
                  <span className="hof-plaque-name">{inductee.name}</span>
                  <span className="hof-plaque-epithet">{inductee.epithet}</span>
                  <span className="hof-plaque-types">
                    {inductee.types.map((type) => (
                      <span key={type} className={`pokemon-type-badge type-${type}`}>{type}</span>
                    ))}
                  </span>
                  <span className="hof-plaque-honors">
                    {inductee.topHonors.length > 0 ? (
                      inductee.topHonors.map((honor) => (
                        <HonorChip key={honor.id} honor={honor} />
                      ))
                    ) : (
                      <span className="hof-honor-empty">Awaiting honors</span>
                    )}
                  </span>
                </span>

                <span className="hof-plaque-footer">
                  <span>Gen {inductee.generation} - {inductee.region}</span>
                  <span>{formatDate(inductee.inductedAt)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="page-btn"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
            >
              &laquo; Prev
            </button>
            <span className="ui-page-count">Page {validCurrentPage} of {totalPages}</span>
            <button
              type="button"
              className="page-btn"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
            >
              Next &raquo;
            </button>
          </div>
        )}
      </section>

      {selectedInductee && (
        <div className="modal-overlay ui-modal-overlay" onClick={() => setSelectedInductee(null)}>
          <div
            ref={inducteeDialogRef}
            className="modal-content hof-dossier"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hof-dossier-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header detail-modal-head">
              <div className="detail-modal-identity">
                <div className="detail-modal-id-row">
                  <span className="hof-dossier-class">Hall of Fame</span>
                  <span className="modal-dex-id">
                    Inductee #{String(selectedInductee.inductionNumber).padStart(3, '0')}
                  </span>
                  <span className="trophy-category-tag">Gen {selectedInductee.generation}</span>
                </div>
                <h2 className="modal-title" id="hof-dossier-title">{selectedInductee.name}</h2>
                <p className="hof-dossier-epithet">{selectedInductee.epithet}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedInductee(null)}
                aria-label="Close Hall of Fame plaque"
              >
                &times;
              </button>
            </div>

            <div className="hof-dossier-body">
              <div className="hof-dossier-portrait">
                <div className="hof-dossier-image star-tier-20">
                  <span className="hof-dossier-glow" aria-hidden="true" />
                  <PokemonImage pokemon={selectedInductee.pokemon} isShiny alt="" />
                  <span className="hof-dossier-star">20★</span>
                </div>
                <div className="hof-dossier-meta">
                  <span className="modal-dex-id">
                    #{String(selectedInductee.dexNo).padStart(4, '0')}
                    {selectedInductee.isForm && selectedInductee.pokemon.label
                      ? ` + ${selectedInductee.pokemon.label}`
                      : ''}
                  </span>
                  <span>{selectedInductee.region}</span>
                  <span>{selectedInductee.genus}</span>
                </div>
                <div className="hof-dossier-types">
                  {selectedInductee.types.map((type) => (
                    <span key={type} className={`pokemon-type-badge type-${type}`}>{type}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="ui-btn primary hof-dossier-view-card"
                  onClick={() => {
                    setSelectedPokemon(selectedInductee);
                    setSelectedInductee(null);
                  }}
                >
                  View battle details
                </button>
              </div>

              <div className="hof-dossier-info">
                <div className="hof-dossier-induction">
                  <span className="ui-field-label">Induction record</span>
                  <strong>{formatDate(selectedInductee.inductedAt)}</strong>
                  <small>Entered at 20 stars with {selectedInductee.entry?.dupes_collected || 0} duplicates collected.</small>
                </div>

                <div className="hof-dossier-honors-head">
                  <span className="ui-field-label">Honors</span>
                  <span className="ui-badge">{selectedInductee.honors.length} collections</span>
                </div>

                {honorGroups.length > 0 ? (
                  <div className="hof-honor-groups">
                    {honorGroups.map((group) => (
                      <section
                        key={group.id}
                        className="hof-honor-group"
                        style={{ '--honor-accent': group.accent }}
                      >
                        <h3>{group.label}</h3>
                        <div className="hof-honor-list">
                          {group.honors.map((honor) => (
                            <span key={honor.id} className="hof-honor-ribbon">
                              {honor.name}
                            </span>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="hof-honor-empty">No collection honors recorded for this card.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPokemon && (
        <PokemonDetailModal
          pokemon={selectedPokemon.pokemon}
          entry={selectedPokemon.entry}
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}

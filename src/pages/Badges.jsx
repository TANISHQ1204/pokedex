import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import { getBadgeStatus } from '../game/badges';
import badgesList from '../data/badges.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { GymBadgeIcon } from '../components/icons/GameIcons';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Color map per gym/region badge for glowing gem cores
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

export default function Badges() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [sectionFilter, setSectionFilter] = useState('all'); // 'all' | 'regional' | 'gym'
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  // Fast map lookup for pokemonList
  const pokemonMap = useMemo(() => {
    const map = new Map();
    pokemonList.forEach((p) => map.set(p.id, p));
    return map;
  }, []);

  // Load user collection from Supabase
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

  // Compute status for all badges
  const evaluatedBadges = useMemo(() => {
    return badgesList.map((badge) => {
      const status = getBadgeStatus(badge, collectionMap);
      const isRegional = badge.id.startsWith('badge_kanto') ||
        badge.id.startsWith('badge_johto') ||
        badge.id.startsWith('badge_hoenn') ||
        badge.id.startsWith('badge_sinnoh') ||
        badge.id.startsWith('badge_unova') ||
        badge.id.startsWith('badge_kalos') ||
        badge.id.startsWith('badge_alola') ||
        badge.id.startsWith('badge_galar') ||
        badge.id.startsWith('badge_paldea');

      return {
        ...badge,
        status,
        type: isRegional ? 'regional' : 'gym',
        gemColor: BADGE_COLOR_MAP[badge.id] || '#f59e0b',
      };
    });
  }, [collectionMap]);

  // Summary counts
  const summary = useMemo(() => {
    let unlocked = 0;
    evaluatedBadges.forEach((b) => {
      if (b.status.isUnlocked) unlocked++;
    });
    return {
      unlocked,
      total: evaluatedBadges.length,
      percentage: Math.round((unlocked / evaluatedBadges.length) * 100),
    };
  }, [evaluatedBadges]);

  // Filtered badges list
  const filteredBadges = useMemo(() => {
    if (sectionFilter === 'all') return evaluatedBadges;
    return evaluatedBadges.filter((b) => b.type === sectionFilter);
  }, [evaluatedBadges, sectionFilter]);

  return (
    <div className="page-container">
      {/* HEADER & GYM BADGE CASE SUMMARY */}
      <div className="collection-header">
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.75rem' }}>League Gym Badge Case</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Earn binary Gym Badges by completing 100% of Regional Dexes & Curated Gym Sets!
          </p>
        </div>

        {/* Badge Case Counter Box */}
        <div className="collection-progress-card" style={{ border: '1px solid #d97706', background: 'rgba(30, 27, 75, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 700, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <GymBadgeIcon size={18} color="#f59e0b" /> Badges Collected
            </span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>
              {summary.unlocked} / {summary.total} ({summary.percentage}%)
            </span>
          </div>
          <div className="hp-bar-outer" style={{ height: '10px' }}>
            <div className="hp-bar-inner hp-yellow" style={{ width: `${summary.percentage}%` }} />
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="gen-shortcuts">
        {[
          { label: 'All Badges (17)', value: 'all' },
          { label: 'Regional Champion Badges (9)', value: 'regional' },
          { label: 'Classic Gym Badges (8)', value: 'gym' },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`gen-badge-btn ${sectionFilter === tab.value ? 'active' : ''}`}
            onClick={() => setSectionFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GYM BADGE CASE CONTAINER */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Opening Gym Badge Case...
        </div>
      ) : (
        <div className="badge-case-wrapper">
          <div className="badge-case-title-row">
            <span>OFFICIAL POKÉMON LEAGUE DISPLAY CASE</span>
            <span>{summary.unlocked} BADGES EARNED</span>
          </div>

          <div className="badge-case-grid">
            {filteredBadges.map((badge) => {
              const { status } = badge;
              const isUnlocked = status.isUnlocked;

              return (
                <div
                  key={badge.id}
                  className={`badge-case-slot ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => setSelectedBadge(badge)}
                >
                  <div className="badge-slot-icon-wrapper">
                    <GymBadgeIcon size={36} color={badge.gemColor} isUnlocked={isUnlocked} />
                  </div>

                  <div className="badge-slot-title">{badge.name}</div>
                  <div className="badge-slot-region">{badge.region}</div>

                  {isUnlocked ? (
                    <div className="badge-earned-tag">✨ EARNED</div>
                  ) : (
                    <div className="badge-progress-box">
                      <div className="badge-progress-text">
                        {status.ownedCount}/{status.totalCount} ({status.progressPercent}%)
                      </div>
                      <div className="hp-bar-outer" style={{ height: '6px' }}>
                        <div
                          className="hp-bar-inner hp-yellow"
                          style={{ width: `${status.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BADGE DETAILS MODAL */}
      {selectedBadge && (
        <div className="modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <GymBadgeIcon size={36} color={selectedBadge.gemColor} isUnlocked={selectedBadge.status.isUnlocked} />
                <div>
                  <span className="modal-dex-id">{selectedBadge.region}</span>
                  <h2 className="modal-title">{selectedBadge.name}</h2>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedBadge(null)}>
                &times;
              </button>
            </div>

            {/* Badge Info Card */}
            <div className="collection-progress-card" style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '0.5rem' }}>
                {selectedBadge.description}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span>
                  Set Completion: <strong>{selectedBadge.status.ownedCount} / {selectedBadge.status.totalCount}</strong> Pokémon
                </span>
                <span style={{ color: selectedBadge.status.isUnlocked ? '#4ade80' : '#f59e0b', fontWeight: 700 }}>
                  {selectedBadge.status.isUnlocked ? '✨ EARNED (100%)' : `${selectedBadge.status.progressPercent}%`}
                </span>
              </div>

              <div className="hp-bar-outer" style={{ height: '10px' }}>
                <div
                  className={`hp-bar-inner ${selectedBadge.status.isUnlocked ? 'hp-green' : 'hp-yellow'}`}
                  style={{ width: `${selectedBadge.status.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Pokémon Grid */}
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc' }}>Included Pokémon in Set</h4>
            <div className="collection-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {selectedBadge.pokemonIds.map((id) => {
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

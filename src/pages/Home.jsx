import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import { getTrophyTier } from '../game/trophies';
import { getBadgeStatus } from '../game/badges';
import { TYPE_CHART } from '../game/battle';
import collectionsList from '../data/collections.json' with { type: 'json' };
import badgesList from '../data/badges.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { isNormalRecord } from '../utils/cardTypes';
import { fetchRecentPulls, fetchBattleHistory, computeBattleRecord, summarizePulls, formatTimeAgo, mergeCollectionPulls } from '../store/stats';
import PokemonDetailModal from '../components/PokemonDetailModal';
import {
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
  GymBadgeIcon,
  PokedexBookIcon,
  SparkleStarIcon,
  ChartBarIcon,
} from '../components/icons/GameIcons';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Canonical order of all 18 types used to render the full effectiveness matrix.
const TYPE_ORDER = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

export default function Home() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState({ history: [], pulls: [], collection: [] });
  const [selectedShowcase, setSelectedShowcase] = useState(null);
  const [typeChartOpen, setTypeChartOpen] = useState(false);

  // User display name
  const trainerName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Trainer';

  // Fetch collection from Supabase
  useEffect(() => {
    async function loadCollection() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const data = await getUserCollection(user.id);
        const map = new Map();
        data.forEach((entry) => {
          // Pokedex Completion reflects ONLY normal card ownership. Power Cards and
          // Ancient Cards are independent trophy records and never count toward it.
          if (isNormalRecord(entry)) {
            map.set(Number(entry.pokemon_id), entry);
          }
        });
        setCollectionMap(map);
      } catch (err) {
        console.error('Failed to load collection:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollection();
  }, [user]);

  // Fetch recent activity for the compact stats widget + Top Collection Showcase
  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      if (!user?.id) return;
      const [history, pulls, collection] = await Promise.all([
        fetchBattleHistory(user.id, 100),
        fetchRecentPulls(user.id, 10),
        getUserCollection(user.id).catch(() => []),
      ]);
      if (!cancelled) {
        setActivity({ history, pulls, collection });
      }
    }
    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const battleRecord = useMemo(() => computeBattleRecord(activity.history), [activity.history]);
  const pullSummary = useMemo(() => summarizePulls(activity.pulls), [activity.pulls]);
  const lastPullPkmn = useMemo(() => {
    if (!pullSummary.recent) return null;
    return pokemonList.find((p) => Number(p.id) === Number(pullSummary.recent.pokemon_id)) || null;
  }, [pullSummary]);

  // Compute Dashboard Stats
  const stats = useMemo(() => {
    const totalOwned = collectionMap.size;
    const completionPercent = Math.round((totalOwned / pokemonList.length) * 100);

    let maxedShinyCount = 0;
    collectionMap.forEach((entry) => {
      if (entry.is_shiny || entry.star_level >= 5) {
        maxedShinyCount++;
      }
    });

    // Trophies stats
    let goldTrophies = 0;
    let silverTrophies = 0;
    let bronzeTrophies = 0;

    collectionsList.forEach((col) => {
      const tierObj = getTrophyTier(col, collectionMap);
      if (tierObj.tier === 'gold') goldTrophies++;
      else if (tierObj.tier === 'silver') silverTrophies++;
      else if (tierObj.tier === 'bronze') bronzeTrophies++;
    });

    // Badges stats
    let badgesUnlocked = 0;
    badgesList.forEach((badge) => {
      const status = getBadgeStatus(badge, collectionMap);
      if (status.isUnlocked) badgesUnlocked++;
    });

    return {
      totalOwned,
      completionPercent,
      maxedShinyCount,
      goldTrophies,
      silverTrophies,
      bronzeTrophies,
      totalTrophies: goldTrophies + silverTrophies + bronzeTrophies,
      badgesUnlocked,
      totalBadges: badgesList.length,
    };
  }, [collectionMap]);

  // Top Collection Showcase — most recently obtained cards (live pulls merged
  // with pre-tracking collection backfill). Clicking a card opens its detail modal.
  const mergedPulls = useMemo(
    () => mergeCollectionPulls(activity.collection, activity.pulls),
    [activity.collection, activity.pulls]
  );

  const showcaseCards = useMemo(() => {
    const seen = new Set();
    const cards = [];
    mergedPulls.forEach((pull) => {
      const id = Number(pull.pokemon_id);
      if (!id || seen.has(id)) return;
      const pkmn = pokemonList.find((p) => Number(p.id) === id);
      if (!pkmn) return;
      seen.add(id);
      cards.push({
        pkmn,
        pull,
        cardType: pull.card_type || 'normal',
        entry: collectionMap.get(id) || null,
      });
    });
    return cards.slice(0, 8);
  }, [mergedPulls, collectionMap]);

  const hasShowcase = showcaseCards.length > 0;

  return (
    <>
    <div className="page-container">
      {/* HERO WELCOME BANNER */}
      <div className="home-hero-card">
        <div className="hero-content">
          <div className="hero-badge">HQ DASHBOARD</div>
          <h1 className="hero-title">Welcome back, {trainerName}!</h1>
          <p className="hero-subtitle">
            Your Pokédex Command Center. Battle trainers, collect National Dex cards, earn gym badges, and achieve trophy glory!
          </p>

          {/* Quick Action Launchers */}
          <div className="hero-actions">
            <Link to="/battle" className="hero-btn primary">
              <SwordsIcon size={20} /> Battle Arena
            </Link>
            <Link
              to="/special-collection"
              className="hero-btn primary"
              style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', border: 'none' }}
            >
              ⚡ Power Cards
            </Link>
            <Link to="/collection" className="hero-btn secondary">
              <CardsIcon size={20} /> Card Collection
            </Link>
            <Link to="/trophies" className="hero-btn secondary">
              <TrophyIcon size={20} tier="gold" /> Trophy Hall
            </Link>
          </div>
        </div>
      </div>

      {/* DASHBOARD STATS GRID */}
      <div className="dashboard-stats-grid">
        {/* Card 1: Pokédex Completion */}
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <PokedexBookIcon size={22} />
            <span className="dash-stat-label">Pokédex Completion</span>
          </div>
          <div className="dash-stat-val">
            {stats.totalOwned} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ 1025</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div className="hp-bar-outer" style={{ height: '8px' }}>
              <div className="hp-bar-inner hp-green" style={{ width: `${stats.completionPercent}%` }} />
            </div>
          </div>
          <div className="dash-stat-subtext">
            {stats.completionPercent}% Completed ({1025 - stats.totalOwned} remaining)
          </div>
        </div>

        {/* Card 2: Trophy Summary */}
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <TrophyIcon size={22} tier="gold" />
            <span className="dash-stat-label">Trophies Hall</span>
          </div>
          <div className="dash-stat-val">
            {stats.totalTrophies} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Unlocked</span>
          </div>
          <div className="dash-pill-row">
            <span className="dash-pill gold"><TrophyIcon size={12} tier="gold" /> {stats.goldTrophies} Gold</span>
            <span className="dash-pill silver"><TrophyIcon size={12} tier="silver" /> {stats.silverTrophies} Silver</span>
            <span className="dash-pill bronze"><TrophyIcon size={12} tier="bronze" /> {stats.bronzeTrophies} Bronze</span>
          </div>
        </div>

        {/* Card 3: Gym Badges */}
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <GymBadgeIcon size={22} color="#f59e0b" />
            <span className="dash-stat-label">Gym Badges</span>
          </div>
          <div className="dash-stat-val">
            {stats.badgesUnlocked} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ {stats.totalBadges}</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div className="hp-bar-outer" style={{ height: '8px' }}>
              <div
                className="hp-bar-inner hp-yellow"
                style={{ width: `${Math.round((stats.badgesUnlocked / stats.totalBadges) * 100)}%` }}
              />
            </div>
          </div>
          <div className="dash-stat-subtext">
            Regional Champion & Gym Sets Completed
          </div>
        </div>

        {/* Card 4: Shiny & Maxed Cards */}
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <SparkleStarIcon size={22} />
            <span className="dash-stat-label">Shiny & Maxed Cards</span>
          </div>
          <div className="dash-stat-val" style={{ color: '#fef08a' }}>
            {stats.maxedShinyCount}
          </div>
          <div className="dash-stat-subtext" style={{ marginTop: '0.75rem' }}>
            5-Star Maxed & Shiny Cards Owned
          </div>
        </div>

        {/* Card 5: Battle Stats / Recent Pull */}
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <ChartBarIcon size={22} />
            <span className="dash-stat-label">Battle Stats</span>
          </div>
          <div className="dash-stat-val">
            {battleRecord.total} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Battles</span>
          </div>
          <div className="dash-pill-row">
            <span className="dash-pill gold"><SwordsIcon size={12} /> {battleRecord.wins} Wins</span>
            <span className="dash-pill silver">Streak: {battleRecord.currentStreak}</span>
          </div>
          {lastPullPkmn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
              <img
                src={lastPullPkmn.sprites.normal}
                alt={formatTitle(lastPullPkmn.name)}
                width={36}
                height={36}
                style={{ objectFit: 'contain', imageRendering: 'pixelated', background: '#0f172a', borderRadius: '0.4rem', padding: '0.1rem 0.2rem' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Pull: {formatTitle(lastPullPkmn.name)}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{formatTimeAgo(pullSummary.recent.created_at)}</div>
              </div>
            </div>
          ) : (
            <div className="dash-stat-subtext" style={{ marginTop: '0.6rem' }}>
              No activity yet — win battles to build your record.
            </div>
          )}
          <Link to="/stats" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem', marginTop: '0.5rem' }}>
            View Full Stats &rarr;
          </Link>
        </div>
      </div>

      {/* TOP COLLECTION SHOWCASE */}
      <div style={{ marginTop: '2rem' }} className="showcase-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div className="hero-badge" style={{ marginBottom: '0.35rem' }}>TOP COLLECTION SHOWCASE</div>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>Recently Obtained Cards</h2>
            <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Your latest pulls — click a card for its full details.
            </p>
          </div>
          <Link to="/stats" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            View Full Stats &rarr;
          </Link>
        </div>

        {!hasShowcase ? (
          <div className="card" style={{ background: 'rgba(30, 41, 59, 0.7)', textAlign: 'center', padding: '2rem' }}>
            <SparkleStarIcon size={28} />
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
              No cards yet — win battles to pull cards and showcase them here.
            </p>
          </div>
        ) : (
          <div className="showcase-grid">
            {showcaseCards.map(({ pkmn, pull, cardType, entry }) => {
              const starLevel = entry?.star_level || Number(pull.star_level) || 0;
              const isShiny = Boolean((entry?.is_shiny) || pull.is_shiny) || starLevel >= 5;
              const spriteSrc = isShiny ? pkmn.sprites.shiny : pkmn.sprites.normal;
              const isSpecial = cardType === 'power' || cardType === 'ancient';
              const typeLabel = cardType === 'power' ? '⚡ Power' : cardType === 'ancient' ? '🏛️ Ancient' : 'Normal';

              return (
                <button
                  key={pkmn.id}
                  type="button"
                  className={`showcase-card ${cardType === 'power' ? 'showcase-power' : cardType === 'ancient' ? 'showcase-ancient' : ''}`}
                  onClick={() => setSelectedShowcase({ pkmn, cardType, entry })}
                >
                  <div className="card-top-id">#{String(pkmn.id).padStart(4, '0')}</div>
                  <div className="showcase-card-image">
                    <img src={spriteSrc} alt={formatTitle(pkmn.name)} />
                    {isShiny && (
                      <div className="shiny-sparkle-badge">
                        <SparkleStarIcon size={12} /> Shiny
                      </div>
                    )}
                  </div>
                  <div className="showcase-card-info">
                    <div className="card-name">{formatTitle(pkmn.name)}</div>
                    <div className="showcase-card-type" style={{ background: isSpecial ? 'rgba(236,72,153,0.15)' : 'rgba(56,189,248,0.12)', color: isSpecial ? '#ec4899' : '#38bdf8' }}>
                      {typeLabel}
                    </div>
                    {starLevel > 0 && (
                      <div className="star-rating">
                        {'★'.repeat(Math.max(1, Math.min(5, starLevel)))}
                        {'☆'.repeat(Math.max(0, 5 - Math.min(5, starLevel)))}
                      </div>
                    )}
                    <div className="showcase-obtained">{formatTimeAgo(pull.created_at)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* TYPE EFFECTIVENESS INFO BUTTON */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <button type="button" className="hero-btn secondary" onClick={() => setTypeChartOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <SwordsIcon size={18} /> Type Effectiveness Chart
        </button>
      </div>
    </div>

    {/* CARD DETAIL MODAL — clicked from the Top Collection Showcase */}
    {selectedShowcase && (
      <PokemonDetailModal
        pokemon={selectedShowcase.pkmn}
        entry={selectedShowcase.entry}
        cardType={selectedShowcase.cardType}
        onClose={() => setSelectedShowcase(null)}
      />
    )}

    {/* FULL 18x18 TYPE EFFECTIVENESS CHART MODAL */}
    {typeChartOpen && (
      <div className="modal-overlay" onClick={() => setTypeChartOpen(false)}>
        <div className="modal-content" style={{ maxWidth: 'min(92vw, 860px)' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <span className="modal-dex-id">TYPE CHART</span>
              <h2 className="modal-title">Type Effectiveness</h2>
            </div>
            <button className="modal-close-btn" onClick={() => setTypeChartOpen(false)}>&times;</button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Rows = attacking type · Columns = defending type. Tap any type chip in the first column to jump, or scroll to explore.
            </div>
            <div className="type-chart-scroll">
              <table className="type-chart-table">
                <thead>
                  <tr>
                    <th className="type-chart-corner">▲ atk → def</th>
                    {TYPE_ORDER.map((t) => (
                      <th key={t}>
                        <span className={`pokemon-type-badge type-${t}`}>{t.charAt(0).toUpperCase()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TYPE_ORDER.map((atk) => (
                    <tr key={atk}>
                      <td className="type-chart-row-label">
                        <span className={`pokemon-type-badge type-${atk}`}>{atk}</span>
                      </td>
                      {TYPE_ORDER.map((def) => {
                        const mult = TYPE_CHART[atk]?.[def] ?? 1;
                        const cls = mult === 0 ? 'mult-immune' : mult >= 2 ? 'mult-super' : mult <= 0.5 ? 'mult-weak' : 'mult-neutral';
                        return <td key={def} className={`type-chart-cell ${cls}`}>{mult === 1 ? '·' : mult}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span style={{ color: '#4ade80' }}>■ 2× Super Effective</span>
              <span style={{ color: '#f87171' }}>■ ½ Not Very Effective</span>
              <span style={{ color: '#64748b' }}>■ 0 No Effect</span>
              <span style={{ color: '#94a3b8' }}>■ ·· Neutral</span>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

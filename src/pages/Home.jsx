import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import { getTrophyTier } from '../game/trophies';
import { getBadgeStatus } from '../game/badges';
import collectionsList from '../data/collections.json' with { type: 'json' };
import badgesList from '../data/badges.json' with { type: 'json' };
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import {
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
  GymBadgeIcon,
  PokedexBookIcon,
  SparkleStarIcon,
} from '../components/icons/GameIcons';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Home() {
  const { user } = useAuth();
  const [collectionMap, setCollectionMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

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
          map.set(Number(entry.pokemon_id), entry);
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

  // Featured Showcase Cards
  const showcasePokemon = useMemo(() => {
    if (collectionMap.size > 0) {
      const ownedList = [];
      collectionMap.forEach((entry, pokemonId) => {
        const pkmn = pokemonList.find((p) => p.id === pokemonId);
        if (pkmn) {
          ownedList.push({ pkmn, entry });
        }
      });
      ownedList.sort((a, b) => (b.entry.star_level || 0) - (a.entry.star_level || 0) || a.pkmn.id - b.pkmn.id);
      return ownedList.slice(0, 6).map((item) => ({ ...item.pkmn, isOwned: true, entry: item.entry }));
    }

    const sampleIds = [6, 9, 3, 25, 150, 384];
    return sampleIds
      .map((id) => pokemonList.find((p) => p.id === id))
      .filter(Boolean)
      .map((pkmn) => ({ ...pkmn, isOwned: false, entry: null }));
  }, [collectionMap]);

  return (
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
              to="/collection?view=power-cards"
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
      </div>

      {/* FEATURED COLLECTION SHOWCASE */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>
              {collectionMap.size > 0 ? 'Top Collection Showcase' : 'Featured National Dex Cards'}
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              {collectionMap.size > 0 ? 'Your highest star-level cards ready for battle' : 'Win 6v6 battles to add cards to your collection!'}
            </p>
          </div>
          <Link to="/collection" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            View All Cards &rarr;
          </Link>
        </div>

        <div className="collection-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {showcasePokemon.map((p) => {
            const isOwned = p.isOwned;
            const starLevel = p.entry?.star_level || 0;
            const isShiny = p.entry?.is_shiny || starLevel >= 5;
            const spriteSrc = isOwned ? (isShiny ? p.sprites.shiny : p.sprites.normal) : p.sprites.normal;

            return (
              <Link
                key={p.id}
                to="/collection"
                className={`collection-card ${isOwned ? 'owned' : 'unowned'}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card-top-id">#{String(p.id).padStart(4, '0')}</div>

                <div className="card-image-wrapper">
                  <img
                    src={spriteSrc}
                    alt={isOwned ? p.name : '???'}
                    className={isOwned ? '' : 'card-silhouette'}
                  />
                  {isShiny && isOwned && (
                    <div className="shiny-sparkle-badge">
                      <SparkleStarIcon size={12} /> Shiny
                    </div>
                  )}
                </div>

                <div className="card-info">
                  <div className="card-name">{formatTitle(p.name)}</div>
                  {isOwned ? (
                    <div className="star-rating">
                      {'★'.repeat(starLevel)}
                      {'☆'.repeat(5 - starLevel)}
                    </div>
                  ) : (
                    <div className="unowned-badge">Unowned</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* QUICK BATTLE CHEAT SHEET WIDGET */}
      <div className="card" style={{ marginTop: '2rem', background: 'rgba(30, 41, 59, 0.7)' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SwordsIcon size={20} /> Type Matchup Quick Reference
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          Use type advantages during 6v6 battles to inflict 2.0x super-effective damage!
        </p>

        <div className="type-cheat-grid">
          {[
            { type: 'fire', superVs: 'Grass, Steel', weakVs: 'Water, Fire, Dragon' },
            { type: 'water', superVs: 'Fire, Ground', weakVs: 'Grass, Water, Dragon' },
            { type: 'grass', superVs: 'Water, Ground', weakVs: 'Fire, Poison, Flying' },
            { type: 'electric', superVs: 'Water, Flying', weakVs: 'Electric, Dragon, Ground' },
            { type: 'poison', superVs: 'Grass, Fairy', weakVs: 'Poison, Ground, Rock' },
            { type: 'dragon', superVs: 'Dragon', weakVs: 'Steel, Fairy' },
          ].map((item) => (
            <div key={item.type} className="type-cheat-card">
              <span className={`pokemon-type-badge type-${item.type}`}>{item.type}</span>
              <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                <div style={{ color: '#4ade80' }}><strong>2x vs:</strong> {item.superVs}</div>
                <div style={{ color: '#f87171', marginTop: '0.15rem' }}><strong>0.5x vs:</strong> {item.weakVs}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

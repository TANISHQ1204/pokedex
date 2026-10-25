import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCollection } from '../store/collection';
import { getTrophyTier } from '../game/trophies';
import { getBadgeStatus } from '../game/badges';
import { TYPE_CHART } from '../game/battle';
import collectionsList from '../data/collections.json' with { type: 'json' };
import badgesList from '../data/badges.json' with { type: 'json' };
import { getPokemonById, fullPokemonList } from '../utils/pokemonCatalog.js';
import { isNormalRecord } from '../utils/cardTypes';
import { MAX_STAR_LEVEL, SHINY_STAR_LEVEL, starTierClass } from '../game/cardLevels.js';
import { fetchRecentPulls, fetchBattleHistory, computeBattleRecord, summarizePulls, formatTimeAgo, mergeCollectionPulls } from '../store/stats';
import { getDailyArcadeGame, getQuickPlayGames } from '../game/arcadeGames';
import { loadArcadeProgress } from '../store/arcadeProgress';
import PokemonDetailModal from '../components/PokemonDetailModal';
import PokemonImage from '../components/PokemonImage';
import StarMeter from '../components/StarMeter';
import HomeProgressTabs from '../components/HomeProgressTabs';
import ArcadeGameCard from '../components/ArcadeGameCard';
import {
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
  GymBadgeIcon,
  PokedexBookIcon,
  SparkleStarIcon,
  ChartBarIcon,
  GamepadIcon,
  UsersFriendsIcon,
  ArcadeGameIcon,
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
  const [arcadeProgress, setArcadeProgress] = useState(() => loadArcadeProgress(user?.id));

  // User display name
  const trainerName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Trainer';

  useEffect(() => {
    setArcadeProgress(loadArcadeProgress(user?.id));
  }, [user?.id]);

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
    return getPokemonById(pullSummary.recent.pokemon_id) || null;
  }, [pullSummary]);

  // Compute dashboard and tab progress from the same collection snapshot so every
  // number on the page stays in sync.
  const stats = useMemo(() => {
    const totalOwned = collectionMap.size;
    const completionPercent = fullPokemonList.length
      ? Math.round((totalOwned / fullPokemonList.length) * 100)
      : 0;

    let maxedShinyCount = 0;
    collectionMap.forEach((entry) => {
      if (entry.is_shiny || entry.star_level >= SHINY_STAR_LEVEL) {
        maxedShinyCount++;
      }
    });

    const trophyCounts = {
      locked: 0,
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      master: 0,
    };
    collectionsList.forEach((col) => {
      const tier = getTrophyTier(col, collectionMap).tier;
      if (trophyCounts[tier] != null) trophyCounts[tier]++;
    });
    const totalTrophies = collectionsList.length;
    const trophiesUnlocked = totalTrophies - trophyCounts.locked;

    const badgeGroups = {
      all: { total: 0, unlocked: 0 },
      regional: { total: 0, unlocked: 0 },
      mastery: { total: 0, unlocked: 0 },
    };
    badgesList.forEach((badge) => {
      const isMastery = badge.criteria === 'star20' || badge.criteria === 'star10';
      const group = isMastery ? badgeGroups.mastery : badgeGroups.regional;
      const isUnlocked = getBadgeStatus(badge, collectionMap).isUnlocked;
      group.total++;
      badgeGroups.all.total++;
      if (isUnlocked) {
        group.unlocked++;
        badgeGroups.all.unlocked++;
      }
    });

    return {
      totalOwned,
      completionPercent,
      maxedShinyCount,
      trophyCounts,
      totalTrophies,
      trophiesUnlocked,
      badgeGroups,
      badgesUnlocked: badgeGroups.all.unlocked,
      totalBadges: badgesList.length,
    };
  }, [collectionMap]);

  const dailyGame = useMemo(() => getDailyArcadeGame(new Date()), []);
  const quickPlayGames = useMemo(() => getQuickPlayGames(new Date()), []);

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
      const pkmn = getPokemonById(id);
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
    <div className="page-container home-page">
      <section className="home-arcade-hero">
        <div className="home-hero-copy">
          <div className="home-hero-eyebrow">
            <GamepadIcon size={18} />
            <span>Poké Arcade</span>
            <span className="home-live-dot">Daily run live</span>
          </div>
          <h1>Play a quick run.<br />Pull the next card.</h1>
          <p className="home-hero-subtitle">
            Welcome back, {trainerName}. The arcade is your new home for short challenges,
            daily rotations, and collection rewards — with the full league still a click away.
          </p>
          <div className="home-hero-actions">
            <Link to="/arcade" className="home-cta primary">
              <GamepadIcon size={20} /> Enter Poké Arcade
            </Link>
            <Link to="/collection" className="home-cta secondary">
              <CardsIcon size={20} /> View Collection
            </Link>
          </div>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> Today&apos;s featured: {dailyGame.name}</span>
            <span>{quickPlayGames.length} more quick-play runs</span>
            <span>{arcadeProgress.streak?.current || 0} {(arcadeProgress.streak?.current || 0) === 1 ? 'day' : 'days'} arcade streak</span>
          </div>
        </div>

        <div
          className="home-feature-card"
          style={{ '--game-accent': dailyGame.accent, '--game-accent-2': dailyGame.accent2 }}
        >
          <div className="home-feature-glow" aria-hidden="true" />
          <div className="home-feature-head">
            <span className="home-eyebrow">Daily featured</span>
            <span className="home-feature-time">{dailyGame.duration}</span>
          </div>
          <div className="home-feature-body">
            <div className="home-feature-icon">
              <ArcadeGameIcon gameId={dailyGame.id} size={42} />
            </div>
            <div>
              <span className="arcade-game-eyebrow">{dailyGame.eyebrow}</span>
              <h2>{dailyGame.name}</h2>
              <p>{dailyGame.tagline}</p>
            </div>
          </div>
          <div className="home-feature-meta">
            <span>{dailyGame.difficulty}</span>
            <span>{dailyGame.reward}</span>
            <span>Rotates daily</span>
          </div>
          <Link
            to={dailyGame.playable ? `/arcade/play/${dailyGame.id}` : `/arcade?game=${dailyGame.id}`}
            className="home-feature-cta"
          >
            {dailyGame.playable ? 'Play' : 'Preview'} today&apos;s run <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="home-metric-strip" aria-label="Trainer overview">
        <Link to="/collection" className="home-metric">
          <span className="home-metric-icon"><PokedexBookIcon size={20} /></span>
          <span className="home-metric-copy">
            <span className="home-metric-label">Pokédex</span>
            <strong>{isLoading ? '—' : stats.totalOwned} <small>/ {fullPokemonList.length}</small></strong>
            <span className="home-metric-track"><span style={{ width: `${isLoading ? 0 : stats.completionPercent}%` }} /></span>
          </span>
          <span className="home-metric-value">{isLoading ? '—' : `${stats.completionPercent}%`}</span>
        </Link>

        <Link to="/trophies" className="home-metric">
          <span className="home-metric-icon"><TrophyIcon size={20} tier="gold" /></span>
          <span className="home-metric-copy">
            <span className="home-metric-label">Trophies</span>
            <strong>{isLoading ? '—' : stats.trophiesUnlocked} <small>/ {stats.totalTrophies}</small></strong>
            <span className="home-metric-track gold">
              <span style={{ width: `${stats.totalTrophies ? Math.round((stats.trophiesUnlocked / stats.totalTrophies) * 100) : 0}%` }} />
            </span>
          </span>
          <span className="home-metric-value">{stats.trophyCounts.gold} gold</span>
        </Link>

        <Link to="/badges" className="home-metric">
          <span className="home-metric-icon"><GymBadgeIcon size={20} color="#f59e0b" /></span>
          <span className="home-metric-copy">
            <span className="home-metric-label">Badges</span>
            <strong>{isLoading ? '—' : stats.badgesUnlocked} <small>/ {stats.totalBadges}</small></strong>
            <span className="home-metric-track green">
              <span style={{ width: `${stats.totalBadges ? Math.round((stats.badgesUnlocked / stats.totalBadges) * 100) : 0}%` }} />
            </span>
          </span>
          <span className="home-metric-value">{stats.badgeGroups.mastery.unlocked} mastery</span>
        </Link>

        <Link to="/stats" className="home-metric">
          <span className="home-metric-icon"><SparkleStarIcon size={20} /></span>
          <span className="home-metric-copy">
            <span className="home-metric-label">Maxed shiny</span>
            <strong>{isLoading ? '—' : stats.maxedShinyCount}</strong>
            <span className="home-metric-note">{MAX_STAR_LEVEL}-star cards</span>
          </span>
          <span className="home-metric-value">{battleRecord.wins}W</span>
        </Link>
      </section>

      <HomeProgressTabs collectionMap={collectionMap} stats={stats} isLoading={isLoading} />

      <section className="home-section" id="quick-play">
        <div className="home-section-head">
          <div>
            <span className="home-eyebrow">Quick play</span>
            <h2>Choose your next run</h2>
            <p>Short sessions built around what you already collect. Every run feeds the same card pool.</p>
          </div>
          <Link className="home-text-link" to="/arcade">
            Open arcade <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="arcade-game-grid">
          {quickPlayGames.map((game) => (
            <ArcadeGameCard
              key={game.id}
              game={game}
              ctaLabel={game.playable ? 'Play run' : 'Preview run'}
            />
          ))}
        </div>
      </section>

      <div className="home-lower-grid">
        <section className="home-showcase" aria-labelledby="recent-cards-title">
          <div className="home-section-head">
            <div>
              <span className="home-eyebrow">Collection highlights</span>
              <h2 id="recent-cards-title">Recently obtained cards</h2>
              <p>Your latest pulls — click a card for its full details.</p>
            </div>
            <Link className="home-text-link" to="/stats">
              Full stats <span aria-hidden="true">→</span>
            </Link>
          </div>

          {!hasShowcase ? (
            <div className="home-empty-state">
              <SparkleStarIcon size={28} />
              <p>No cards yet — win battles and clear arcade runs to pull your first cards.</p>
              <Link to="/battle" className="home-text-link">Start a battle →</Link>
            </div>
          ) : (
            <div className="showcase-grid home-showcase-grid">
              {showcaseCards.map(({ pkmn, pull, cardType, entry }) => {
                const starLevel = entry?.star_level || Number(pull.star_level) || 0;
                const isShiny = Boolean((entry?.is_shiny) || pull.is_shiny) || starLevel >= SHINY_STAR_LEVEL;
                const isSpecial = cardType === 'power' || cardType === 'ancient';
                const typeLabel = cardType === 'power' ? '⚡ Power' : cardType === 'ancient' ? '🏛️ Ancient' : 'Normal';
                const tierClass = !isSpecial && starLevel > 0 ? starTierClass(starLevel) : '';

                return (
                  <button
                    key={pkmn.id}
                    type="button"
                    className={`showcase-card ${cardType === 'power' ? 'showcase-power' : cardType === 'ancient' ? 'showcase-ancient' : ''} ${tierClass}`.trim()}
                    onClick={() => setSelectedShowcase({ pkmn, cardType, entry })}
                  >
                    <div className="card-top-id">#{String(pkmn.id).padStart(4, '0')}</div>
                    <div className="showcase-card-image">
                      <PokemonImage pokemon={pkmn} isShiny={isShiny} alt={formatTitle(pkmn.name)} />
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
                      {starLevel > 0 && !isSpecial && (
                        <StarMeter starLevel={starLevel} size="compact" showCount={false} />
                      )}
                      <div className="showcase-obtained">{formatTimeAgo(pull.created_at)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="home-activity" aria-label="Trainer activity">
          <div className="home-activity-card">
            <div className="home-activity-head">
              <span className="home-eyebrow">Battle pulse</span>
              <SwordsIcon size={18} />
            </div>
            <div className="home-battle-score">
              <strong>{battleRecord.wins}</strong>
              <span>wins</span>
              <strong>{battleRecord.losses}</strong>
              <span>losses</span>
            </div>
            <div className="home-battle-details">
              <span>{battleRecord.total} battles</span>
              <span>{battleRecord.currentStreak} current streak</span>
            </div>
            <Link to="/stats" className="home-text-link">View battle log →</Link>
          </div>

          <div className="home-activity-card">
            <div className="home-activity-head">
              <span className="home-eyebrow">Latest pull</span>
              <CardsIcon size={18} />
            </div>
            {lastPullPkmn ? (
              <div className="home-last-pull">
                <img
                  src={lastPullPkmn.sprites.normal}
                  alt={formatTitle(lastPullPkmn.name)}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  width={54}
                  height={54}
                />
                <div>
                  <strong>{formatTitle(lastPullPkmn.name)}</strong>
                  <span>{formatTimeAgo(pullSummary.recent.created_at)}</span>
                </div>
              </div>
            ) : (
              <p className="home-activity-empty">No pulls yet. Your first run is waiting.</p>
            )}
            <Link to="/collection" className="home-text-link">Browse collection →</Link>
          </div>
        </aside>
      </div>

      <section className="home-section" aria-labelledby="trainer-tools-title">
        <div className="home-section-head">
          <div>
            <span className="home-eyebrow">Trainer tools</span>
            <h2 id="trainer-tools-title">The rest of your league</h2>
            <p>The arcade is the front door, but every existing mode stays close at hand.</p>
          </div>
        </div>
        <div className="home-tool-grid">
          <Link to="/battle" className="home-tool-card">
            <SwordsIcon size={22} />
            <span><strong>CPU Battle</strong><small>Build your record</small></span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/game-modes" className="home-tool-card">
            <GamepadIcon size={22} />
            <span><strong>Game Modes</strong><small>More ways to play</small></span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/friends" className="home-tool-card">
            <UsersFriendsIcon size={22} />
            <span><strong>Friends</strong><small>Compare collections</small></span>
            <span aria-hidden="true">→</span>
          </Link>
          <button type="button" className="home-tool-card" onClick={() => setTypeChartOpen(true)}>
            <ChartBarIcon size={22} />
            <span><strong>Type chart</strong><small>Check matchups</small></span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
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
              <span style={{ color: '#94a3b8' }}>■ 0 No Effect</span>
              <span style={{ color: '#94a3b8' }}>■ ·· Neutral</span>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

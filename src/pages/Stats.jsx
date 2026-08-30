import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import { getUserCollection } from '../store/collection';
import { SwordsIcon, ChartBarIcon, SparkleStarIcon, TrophyIcon } from '../components/icons/GameIcons';
import {
  fetchBattleHistory,
  fetchRecentPulls,
  computeBattleRecord,
  computeBattlesPerDay,
  computeMostFoughtOpponents,
  findFastestWin,
  mergeCollectionPulls,
  summarizeCollection,
  formatTimeAgo,
  formatDate,
} from '../store/stats';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const pokemonById = new Map(pokemonList.map((p) => [Number(p.id), p]));

const CARD_TYPE_META = {
  normal: { label: 'Normal', chipClass: 'pull-type-normal' },
  power: { label: 'Power', chipClass: 'pull-type-power' },
  ancient: { label: 'Ancient', chipClass: 'pull-type-ancient' },
};

function PokemonSprite({ id, size = 48 }) {
  const pkmn = pokemonById.get(Number(id));
  if (!pkmn) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '0.5rem',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: `${size * 0.4}px`,
        }}
      >
        ?
      </div>
    );
  }
  return (
    <img
      src={pkmn.sprites.normal}
      alt={formatTitle(pkmn.name)}
      width={size}
      height={size}
      style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
    />
  );
}

export default function Stats() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [battles, cards, owned] = await Promise.all([
        fetchBattleHistory(user.id, 400),
        fetchRecentPulls(user.id, 40),
        getUserCollection(user.id).catch(() => []),
      ]);
      if (!cancelled) {
        setHistory(battles);
        setPulls(cards);
        setCollection(owned);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const record = useMemo(() => computeBattleRecord(history), [history]);
  const battlesPerDay = useMemo(() => computeBattlesPerDay(history, 14), [history]);
  const mostFought = useMemo(() => computeMostFoughtOpponents(history, 5), [history]);
  const fastestWin = useMemo(() => findFastestWin(history), [history]);

  // Pulls are the live card_pulls feed PLUS cards the user owned before
  // analytics tracking existed (backfilled from their collection records).
  const mergedPulls = useMemo(() => mergeCollectionPulls(collection, pulls), [collection, pulls]);
  const collectionSummary = useMemo(() => summarizeCollection(collection), [collection]);

  const maxDaily = Math.max(1, ...battlesPerDay.map((d) => d.count));
  const winRate = record.total > 0 ? record.winRate : 0;

  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>Loading battle analytics...</div>
      </div>
    );
  }

  const hasData = record.total > 0 || mergedPulls.length > 0;
  const hasBackfilledCards = pulls.length === 0 && mergedPulls.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="home-hero-card" style={{ padding: '1.5rem 2rem' }}>
        <div className="hero-badge">TRAINER ANALYTICS</div>
        <h1 className="hero-title" style={{ fontSize: '1.6rem' }}>
          <ChartBarIcon size={26} style={{ verticalAlign: '-4px', marginRight: '0.5rem' }} />
          Stats &amp; Activity
        </h1>
        <p className="hero-subtitle" style={{ marginBottom: 0 }}>
          Your battle record, recent card pulls, and daily training activity.
        </p>
      </div>

      {!hasData ? (
        <div className="card" style={{ background: 'rgba(30, 41, 59, 0.7)', textAlign: 'center', padding: '2.5rem' }}>
          <SwordsIcon size={32} />
          <h3 style={{ color: '#f8fafc', margin: '0.75rem 0 0.4rem 0' }}>No activity yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.25rem 0', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Stats populate automatically after your first battle or card pull. Head to the Battle Arena to get going!
          </p>
          <Link to="/battle" className="hero-btn primary">
            <SwordsIcon size={20} /> Battle Arena
          </Link>
        </div>
      ) : (
        <>
          {/* Battle Record */}
          <div className="dashboard-stats-grid">
            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <SwordsIcon size={22} />
                <span className="dash-stat-label">Battles</span>
              </div>
              <div className="dash-stat-val">{record.total}</div>
              <div className="dash-stat-subtext">
                {record.wins}W · {record.losses}L · {record.draws}D
              </div>
              <div style={{ margin: '0.4rem 0' }}>
                <div className="hp-bar-outer" style={{ height: '6px' }}>
                  <div className="hp-bar-inner hp-green" style={{ width: `${winRate}%` }} />
                </div>
              </div>
              <div className="dash-stat-subtext">{winRate}% win rate</div>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <TrophyIcon size={22} tier="gold" />
                <span className="dash-stat-label">Win Streak</span>
              </div>
              <div className="dash-stat-val" style={{ color: '#fef08a' }}>
                {record.currentStreak}
              </div>
              <div className="dash-stat-subtext">Current streak</div>
              <div className="dash-stat-subtext" style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                Best: {record.longestStreak} in a row
              </div>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <SparkleStarIcon size={22} />
                <span className="dash-stat-label">Cards Pulled</span>
              </div>
              <div className="dash-stat-val">{mergedPulls.length}</div>
              <div className="dash-stat-subtext">
                {hasBackfilledCards
                  ? 'Includes backfilled cards from your pre-tracking collection'
                  : 'Recently obtained cards tracked'}
              </div>
            </div>
          </div>

          {/* Pre-tracking collection history explanation */}
          {hasBackfilledCards && (
            <div className="card" style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ color: '#7dd3fc', fontSize: '0.85rem', lineHeight: 1.5 }}>
                <strong>Showing card history from before tracking existed:</strong>{' '}
                {collectionSummary.total} cards owned ({collectionSummary.normal} normal · {collectionSummary.power} power · {collectionSummary.ancient} ancient)
                {collectionSummary.shiny > 0 ? `, ${collectionSummary.shiny} shiny` : ''}
                {collectionSummary.dupes > 0 ? `, ${collectionSummary.dupes} duplicates` : ''}. These were backfilled from your collection.
                Battle records only exist for fights after analytics were introduced.
              </div>
            </div>
          )}

          {/* Battles per day trend + most-fought */}
          <div style={{ marginTop: '1.25rem' }} className="card batt-stats-card">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ChartBarIcon size={20} /> Battles Per Day <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>(last 14 days)</span>
            </h3>
            <div className="daily-bars" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 120, marginTop: '0.75rem' }}>
              {battlesPerDay.map((day) => (
                <div key={day.dateKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{day.count > 0 ? day.count : ''}</span>
                  <div
                    className={`daily-bar ${day.isToday ? 'daily-bar-today' : ''}`}
                    style={{
                      width: '100%',
                      height: `${Math.max(4, (day.count / maxDaily) * 80)}px`,
                      borderRadius: '3px 3px 0 0',
                      background: day.isToday ? 'linear-gradient(180deg, #f59e0b, #d97706)' : 'linear-gradient(180deg, #38bdf8, #0369a1)',
                    }}
                  />
                  <span style={{ fontSize: '0.6rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Battle Record Detail + Most Fought */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            <div className="card" style={{ background: 'rgba(30, 41, 59, 0.7)' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Record Breakdown</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 90 }}>
                  <div className="dash-stat-val" style={{ color: '#4ade80' }}>{record.wins}</div>
                  <div className="dash-stat-label">Wins</div>
                </div>
                <div style={{ flex: 1, minWidth: 90 }}>
                  <div className="dash-stat-val" style={{ color: '#f87171' }}>{record.losses}</div>
                  <div className="dash-stat-label">Losses</div>
                </div>
                <div style={{ flex: 1, minWidth: 90 }}>
                  <div className="dash-stat-val" style={{ color: '#94a3b8' }}>{record.draws}</div>
                  <div className="dash-stat-label">Draws</div>
                </div>
              </div>
              {fastestWin && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
                  <div className="dash-stat-label" style={{ marginBottom: '0.4rem' }}>Fastest Victory</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.2rem 0.4rem' }}>
                      <PokemonSprite id={fastestWin.opponentLead} size={40} />
                    </div>
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatTitle(pokemonById.get(Number(fastestWin.opponentLead))?.name || '??')} in {fastestWin.turns} moves
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {fastestWin.mode === 'friend' ? 'Friend match' : 'CPU battle'} · {formatDate(fastestWin.date)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ background: 'rgba(30, 41, 59, 0.7)' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Most Fought Pokémon</h3>
              {mostFought.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No opponent data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {mostFought.map(({ pokemonId, count }, i) => (
                    <div key={pokemonId} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 800, width: 16 }}>#{i + 1}</span>
                      <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.2rem 0.4rem' }}>
                        <PokemonSprite id={pokemonId} size={36} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>
                          {formatTitle(pokemonById.get(Number(pokemonId))?.name || '???')}
                        </div>
                        <div className="hp-bar-outer" style={{ height: '4px', marginTop: '0.25rem' }}>
                          <div
                            className="hp-bar-inner hp-orange"
                            style={{ width: `${Math.round((count / mostFought[0].count) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Pulls Feed */}
          <div style={{ marginTop: '1.25rem' }} className="card batt-stats-card">
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>
              Recently Obtained Cards <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>({mergedPulls.length})</span>
            </h3>
            {mergedPulls.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Win battles to pull cards and track them here.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {mergedPulls.slice(0, 20).map((pull, i) => {
                  const meta = CARD_TYPE_META[pull.card_type] || CARD_TYPE_META.normal;
                  const pkmn = pokemonById.get(Number(pull.pokemon_id));
                  return (
                    <div
                      key={pull.id || `pull-${i}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.25rem',
                        borderBottom: i < mergedPulls.slice(0, 20).length - 1 ? '1px solid #1e293b' : 'none',
                      }}
                    >
                      <div style={{ background: '#0f172a', borderRadius: '0.625rem', padding: '0.25rem 0.4rem' }}>
                        <PokemonSprite id={pull.pokemon_id} size={44} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                            {formatTitle(pkmn?.name || '???')}
                          </span>
                          <span className={`dash-pill ${meta.chipClass}`} style={{ background: '#0f172a' }}>
                            {meta.label}
                          </span>
                          {pull.is_shiny && (
                            <span className="dash-pill gold">
                              <SparkleStarIcon size={10} /> Shiny
                            </span>
                          )}
                          {pull.was_new && (
                            <span className="dash-pill silver">New</span>
                          )}
                          {pull.fromCollection && (
                            <span className="dash-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc' }}>
                              Collection
                            </span>
                          )}
                          <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                            {'★'.repeat(Math.max(1, Number(pull.star_level) || 1))}
                          </span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                          #{String(pull.pokemon_id).padStart(4, '0')} · {formatTimeAgo(pull.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
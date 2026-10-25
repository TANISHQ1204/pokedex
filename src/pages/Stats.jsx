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
  formatDate,
  formatTimeAgo,
} from '../store/stats';

function formatTitle(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const pokemonById = new Map(pokemonList.map((p) => [Number(p.id), p]));

function PokemonSprite({ id, size = 44 }) {
  const pkmn = pokemonById.get(Number(id));
  if (!pkmn) {
    return (
      <span
        className="stats-sprite-fallback"
        style={{ width: size, height: size, fontSize: `${Math.round(size * 0.4)}px` }}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }
  return (
    <img
      src={pkmn.sprites.normal}
      alt={formatTitle(pkmn.name)}
      width={size}
      height={size}
      className="stats-pokemon-sprite"
    />
  );
}

const RESULT_LABEL = {
  won: 'Victory',
  lost: 'Defeat',
  draw: 'Draw',
};

const PULL_TYPE_LABEL = {
  normal: 'Normal',
  power: 'Power',
  ancient: 'Ancient',
};

export default function Stats() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError('');
        const [battles, cards, owned] = await Promise.all([
          fetchBattleHistory(user.id, 400),
          fetchRecentPulls(user.id, 40),
          getUserCollection(user.id),
        ]);
        if (!cancelled) {
          setHistory(battles);
          setPulls(cards);
          setCollection(owned);
        }
      } catch (err) {
        console.error('Failed to load battle analytics:', err.message);
        if (!cancelled) {
          setLoadError('We could not load your analytics. Check your connection and try again.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
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
  const mergedPulls = useMemo(() => mergeCollectionPulls(collection, pulls), [collection, pulls]);
  const collectionSummary = useMemo(() => summarizeCollection(collection), [collection]);

  const recentBattles = history.slice(0, 8);
  const recentPulls = mergedPulls.slice(0, 8);
  const maxDaily = Math.max(1, ...battlesPerDay.map((d) => d.count));
  const winRate = record.total > 0 ? record.winRate : 0;
  const hasData = record.total > 0 || mergedPulls.length > 0;
  const hasBackfilledCards = pulls.length === 0 && mergedPulls.length > 0;

  if (isLoading) {
    return (
      <div className="page-container home-page batch-page stats-page">
        <div className="ui-state batch-loading-state" role="status">
          <span className="ui-spinner" aria-hidden="true" />
          <h3>Loading trainer analytics</h3>
          <p>Gathering battles, win streaks, and card pulls...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container home-page batch-page stats-page">
        <div className="ui-state is-error" role="alert">
          <ChartBarIcon size={34} />
          <h3>Analytics unavailable</h3>
          <p>{loadError}</p>
          <button type="button" className="ui-btn primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container home-page batch-page stats-page">
      <section className="ui-page-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow"><ChartBarIcon size={18} /> Trainer Analytics</span>
          <h1>Your battle record, at a glance.</h1>
          <p>
            Track win rate, streaks, daily training volume, toughest opponents, and every recent card you have pulled.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> {record.total} battles recorded</span>
            <span>{mergedPulls.length} cards pulled</span>
            <span>{record.longestStreak} best win streak</span>
          </div>
        </div>
        <div className="ui-hero-stat-card">
          <span className="ui-stat-eyebrow">Overall win rate</span>
          <strong>{winRate}%</strong>
          <div className="ui-progress" aria-hidden="true">
            <span style={{ width: `${winRate}%` }} />
          </div>
          <small>{record.wins} wins, {record.losses} losses, {record.draws} draws</small>
        </div>
      </section>

      {!hasData ? (
        <section className="ui-panel">
          <div className="ui-state">
            <SwordsIcon size={34} />
            <h3>No activity yet</h3>
            <p>Stats populate automatically after your first battle or card pull. Head to the Battle Arena to get started.</p>
            <Link to="/battle" className="ui-btn primary">
              <SwordsIcon size={20} /> Battle Arena
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="ui-stat-grid stats-summary-grid" aria-label="Battle summary">
            <div className="ui-stat-card">
              <div className="ui-stat-top">
                <span className="ui-stat-icon"><SwordsIcon size={22} /></span>
                <span className="ui-field-label">Battles</span>
              </div>
              <strong className="ui-stat-value">{record.total}</strong>
              <p className="ui-stat-meta">{record.wins} wins, {record.losses} losses, {record.draws} draws</p>
              <div className="ui-progress is-compact" aria-hidden="true">
                <span style={{ width: `${winRate}%` }} />
              </div>
              <small>{winRate}% win rate</small>
            </div>

            <div className="ui-stat-card">
              <div className="ui-stat-top">
                <span className="ui-stat-icon is-gold"><TrophyIcon size={22} tier="gold" /></span>
                <span className="ui-field-label">Win streak</span>
              </div>
              <strong className="ui-stat-value is-gold">{record.currentStreak}</strong>
              <p className="ui-stat-meta">Current streak</p>
              <p className="ui-stat-callout">Best: {record.longestStreak} in a row</p>
            </div>

            <div className="ui-stat-card">
              <div className="ui-stat-top">
                <span className="ui-stat-icon is-purple"><SparkleStarIcon size={22} /></span>
                <span className="ui-field-label">Cards pulled</span>
              </div>
              <strong className="ui-stat-value">{mergedPulls.length}</strong>
              <p className="ui-stat-meta">
                {hasBackfilledCards ? 'Includes pre-tracking collection cards' : 'Cards obtained while tracking was active'}
              </p>
              {collectionSummary.shiny > 0 && (
                <p className="ui-stat-callout">{collectionSummary.shiny} shiny cards owned</p>
              )}
            </div>
          </section>

          {hasBackfilledCards && (
            <section className="ui-panel ui-info-panel">
              <strong>Showing card history from before tracking existed</strong>
              <p>
                {collectionSummary.total} cards owned ({collectionSummary.normal} normal, {collectionSummary.power} power, {collectionSummary.ancient} ancient)
                {collectionSummary.shiny > 0 ? `, ${collectionSummary.shiny} shiny` : ''}
                {collectionSummary.dupes > 0 ? `, ${collectionSummary.dupes} duplicates` : ''}.
                These were backfilled from your collection. Battle records only include fights after analytics were introduced.
              </p>
            </section>
          )}

          <section className="ui-panel stats-chart-panel" aria-labelledby="battles-per-day-title">
            <div className="ui-section-head">
              <div>
                <span className="home-eyebrow">Training volume</span>
                <h2 id="battles-per-day-title">Battles per day</h2>
                <p>Last 14 days of arena activity. Today is highlighted.</p>
              </div>
              <span className="ui-badge">{battlesPerDay.reduce((sum, day) => sum + day.count, 0)} recent battles</span>
            </div>
            <div className="stats-chart" role="img" aria-label="Bar chart of battles fought over the last 14 days">
              {battlesPerDay.map((day) => (
                <div key={day.dateKey} className={`stats-chart-column ${day.isToday ? 'is-today' : ''}`}>
                  <span className="stats-chart-value">{day.count > 0 ? day.count : ''}</span>
                  <span
                    className="stats-chart-bar"
                    style={{ height: `${Math.max(4, (day.count / maxDaily) * 100)}%` }}
                  />
                  <span className="stats-chart-label">{day.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="stats-two-col">
            <section className="ui-panel" aria-labelledby="record-breakdown-title">
              <div className="ui-section-head">
                <div>
                  <span className="home-eyebrow">Record</span>
                  <h2 id="record-breakdown-title">Record breakdown</h2>
                </div>
              </div>
              <div className="stats-record-grid">
                <div className="ui-record-item is-win">
                  <strong>{record.wins}</strong>
                  <span>Wins</span>
                </div>
                <div className="ui-record-item is-loss">
                  <strong>{record.losses}</strong>
                  <span>Losses</span>
                </div>
                <div className="ui-record-item">
                  <strong>{record.draws}</strong>
                  <span>Draws</span>
                </div>
              </div>
              {fastestWin ? (
                <div className="stats-fastest-win">
                  <span className="ui-field-label">Fastest victory</span>
                  <div className="stats-fastest-win-row">
                    <span className="stats-sprite-box">
                      <PokemonSprite id={fastestWin.opponentLead} size={40} />
                    </span>
                    <div>
                      <strong>
                        {formatTitle(pokemonById.get(Number(fastestWin.opponentLead))?.name || 'Unknown')} in {fastestWin.turns} moves
                      </strong>
                      <span>{fastestWin.mode === 'friend' ? 'Friend match' : 'CPU battle'} - {formatDate(fastestWin.date)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="ui-inline-empty">Win a battle to record your fastest victory.</p>
              )}
            </section>

            <section className="ui-panel" aria-labelledby="most-fought-title">
              <div className="ui-section-head">
                <div>
                  <span className="home-eyebrow">Rivals</span>
                  <h2 id="most-fought-title">Most fought Pokemon</h2>
                </div>
              </div>
              {mostFought.length === 0 ? (
                <p className="ui-inline-empty">No opponent data yet.</p>
              ) : (
                <div className="stats-opponent-list">
                  {mostFought.map(({ pokemonId, count }, index) => (
                    <div key={pokemonId} className="stats-opponent-row">
                      <span className="stats-rank">#{index + 1}</span>
                      <span className="stats-sprite-box">
                        <PokemonSprite id={pokemonId} size={36} />
                      </span>
                      <div className="stats-opponent-copy">
                        <strong>{formatTitle(pokemonById.get(Number(pokemonId))?.name || 'Unknown')}</strong>
                        <span className="ui-progress is-compact" aria-hidden="true">
                          <span style={{ width: `${Math.round((count / mostFought[0].count) * 100)}%` }} />
                        </span>
                      </div>
                      <span className="stats-opponent-count">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="stats-two-col stats-activity-grid">
            <section className="ui-panel" aria-labelledby="recent-battles-title">
              <div className="ui-section-head">
                <div>
                  <span className="home-eyebrow">Battle log</span>
                  <h2 id="recent-battles-title">Recent battles</h2>
                </div>
                <Link to="/battle" className="ui-text-btn">Battle again</Link>
              </div>
              {recentBattles.length === 0 ? (
                <p className="ui-inline-empty">No battles recorded yet.</p>
              ) : (
                <div className="ui-activity-list">
                  {recentBattles.map((battle, index) => {
                    const lead = Array.isArray(battle.opponent_team) ? battle.opponent_team[0] : null;
                    return (
                      <div key={battle.id || `${battle.created_at}-${index}`} className="ui-activity-row">
                        <span className={`ui-history-result is-${battle.result}`}>
                          {RESULT_LABEL[battle.result] || battle.result}
                        </span>
                        <span className="stats-sprite-box">
                          <PokemonSprite id={lead} size={34} />
                        </span>
                        <div className="ui-activity-row-main">
                          <strong>{battle.opponent_name || (battle.mode === 'friend' ? 'Friend battle' : 'CPU battle')}</strong>
                          <span>
                            {battle.mode === 'friend' ? 'Friend' : 'CPU'} - {battle.turns || 0} moves - {formatDate(new Date(battle.created_at))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="ui-panel" aria-labelledby="recent-pulls-title">
              <div className="ui-section-head">
                <div>
                  <span className="home-eyebrow">Card feed</span>
                  <h2 id="recent-pulls-title">Recent pulls</h2>
                </div>
                <span className="ui-badge">{mergedPulls.length} total</span>
              </div>
              {recentPulls.length === 0 ? (
                <p className="ui-inline-empty">No card pulls recorded yet.</p>
              ) : (
                <div className="stats-pull-grid">
                  {recentPulls.map((pull, index) => {
                    const pkmn = pokemonById.get(Number(pull.pokemon_id));
                    return (
                      <div
                        key={pull.id || `${pull.pokemon_id}-${pull.created_at}-${index}`}
                        className={`stats-pull-card ${pull.is_shiny ? 'is-shiny' : ''}`}
                      >
                        <span className="stats-pull-sprite">
                          <PokemonSprite id={pull.pokemon_id} size={48} />
                        </span>
                        <div className="stats-pull-copy">
                          <strong>{pkmn ? formatTitle(pkmn.name) : 'Unknown'}</strong>
                          <span className={`stats-pull-type is-${pull.card_type || 'normal'}`}>
                            {PULL_TYPE_LABEL[pull.card_type] || 'Normal'}
                          </span>
                          <small>
                            {pull.was_new ? 'New' : `${Math.max(1, Number(pull.star_level) || 1)} star`}
                            {pull.is_shiny ? ' - Shiny' : ''}
                            {pull.fromCollection ? ' - Backfilled' : ''}
                          </small>
                          <time dateTime={pull.created_at}>{formatTimeAgo(pull.created_at)}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

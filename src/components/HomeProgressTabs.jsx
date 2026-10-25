import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fullPokemonList } from '../utils/pokemonCatalog.js';

const DEX_FILTERS = [
  { id: 'all', label: 'All', min: 1, max: 11000 },
  { id: 'gen1', label: 'Gen I', min: 1, max: 151 },
  { id: 'gen2', label: 'Gen II', min: 152, max: 251 },
  { id: 'gen3', label: 'Gen III', min: 252, max: 386 },
  { id: 'gen4', label: 'Gen IV', min: 387, max: 493 },
  { id: 'gen5', label: 'Gen V', min: 494, max: 649 },
  { id: 'gen6', label: 'Gen VI', min: 650, max: 721 },
  { id: 'gen7', label: 'Gen VII', min: 722, max: 809 },
  { id: 'gen8', label: 'Gen VIII', min: 810, max: 905 },
  { id: 'gen9', label: 'Gen IX', min: 906, max: 1025 },
  { id: 'forms', label: 'Forms', min: 10001, max: 11000 },
];

const TROPHY_FILTERS = [
  { id: 'all', label: 'All sets' },
  { id: 'bronze', label: 'Bronze' },
  { id: 'silver', label: 'Silver' },
  { id: 'gold', label: 'Gold' },
  { id: 'platinum', label: 'Platinum' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'master', label: 'Master' },
  { id: 'locked', label: 'Locked' },
];

const TROPHY_COLORS = {
  all: '#fbbf24',
  bronze: '#d97706',
  silver: '#cbd5e1',
  gold: '#fbbf24',
  platinum: '#e2e8f0',
  diamond: '#7dd3fc',
  master: '#f472b6',
  locked: '#64748b',
};

const BADGE_FILTERS = [
  { id: 'all', label: 'All badges' },
  { id: 'regional', label: 'Regional' },
  { id: 'mastery', label: 'Mastery' },
];

const TABS = [
  { id: 'dex', label: 'Pokédex', accent: '#38bdf8', link: '/collection', cta: 'Open collection' },
  { id: 'trophies', label: 'Trophies', accent: '#fbbf24', link: '/trophies', cta: 'Visit trophy hall' },
  { id: 'badges', label: 'Badges', accent: '#4ade80', link: '/badges', cta: 'Review badges' },
];

function ProgressRing({ percent, accent, value, unit }) {
  return (
    <div
      className="progress-ring"
      style={{ '--progress': `${percent}%`, '--ring-accent': accent }}
      role="img"
      aria-label={`${percent}% ${unit}`}
    >
      <div className="progress-ring-inner">
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
    </div>
  );
}

export default function HomeProgressTabs({ collectionMap, stats, isLoading }) {
  const [activeTab, setActiveTab] = useState('dex');
  const [dexFilter, setDexFilter] = useState('all');
  const [trophyFilter, setTrophyFilter] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState('all');

  const dexStats = useMemo(() => {
    const filter = DEX_FILTERS.find((item) => item.id === dexFilter) || DEX_FILTERS[0];
    const entries = fullPokemonList.filter((pokemon) => {
      const id = Number(pokemon.id);
      return id >= filter.min && id <= filter.max;
    });
    const owned = entries.reduce(
      (count, pokemon) => count + (collectionMap.has(Number(pokemon.id)) ? 1 : 0),
      0
    );
    return {
      owned,
      total: entries.length,
      remaining: entries.length - owned,
      percent: entries.length ? Math.round((owned / entries.length) * 100) : 0,
      filterLabel: filter.label,
    };
  }, [collectionMap, dexFilter]);

  const trophyStats = useMemo(() => {
    const total = stats.totalTrophies || 0;
    const counts = stats.trophyCounts || {};
    if (trophyFilter === 'all') {
      const unlocked = stats.trophiesUnlocked || 0;
      return {
        value: unlocked,
        total,
        percent: total ? Math.round((unlocked / total) * 100) : 0,
        unit: 'unlocked',
        detail: `${unlocked} of ${total} trophy sets unlocked`,
        description: `${Math.max(total - unlocked, 0)} sets still need every card before they can earn a tier.`,
        accent: TROPHY_COLORS.all,
      };
    }

    const count = counts[trophyFilter] || 0;
    const label = TROPHY_FILTERS.find((item) => item.id === trophyFilter)?.label || 'Trophy';
    return {
      value: count,
      total,
      percent: total ? Math.round((count / total) * 100) : 0,
      unit: `of ${total}`,
      detail: `${label} tier · ${count} of ${total} sets`,
      description:
        trophyFilter === 'locked'
          ? 'Locked sets unlock once every card in that collection is owned.'
          : `This filter shows ${label.toLowerCase()} trophy sets against the full trophy hall.`,
      accent: TROPHY_COLORS[trophyFilter] || TROPHY_COLORS.all,
    };
  }, [stats, trophyFilter]);

  const badgeStats = useMemo(() => {
    const group = stats.badgeGroups?.[badgeFilter] || { total: 0, unlocked: 0 };
    const percent = group.total ? Math.round((group.unlocked / group.total) * 100) : 0;
    const label = BADGE_FILTERS.find((item) => item.id === badgeFilter)?.label || 'Badges';
    return {
      value: group.unlocked,
      total: group.total,
      percent,
      unit: `of ${group.total}`,
      detail: `${group.unlocked} of ${group.total} ${label.toLowerCase()} earned`,
      description:
        badgeFilter === 'mastery'
          ? 'Mastery badges require every card in the set to reach the 20-star shiny cap.'
          : badgeFilter === 'regional'
            ? 'Regional badges track complete Pokédex sets across each region.'
            : 'Badges are earned by completing regional and 20-star mastery collections.',
      accent: badgeFilter === 'mastery' ? '#f472b6' : badgeFilter === 'regional' ? '#4ade80' : '#fbbf24',
    };
  }, [stats, badgeFilter]);

  const tab = TABS.find((item) => item.id === activeTab) || TABS[0];
  const filters = activeTab === 'dex' ? DEX_FILTERS : activeTab === 'trophies' ? TROPHY_FILTERS : BADGE_FILTERS;
  const selectedFilter = activeTab === 'dex' ? dexFilter : activeTab === 'trophies' ? trophyFilter : badgeFilter;
  const setFilter = activeTab === 'dex' ? setDexFilter : activeTab === 'trophies' ? setTrophyFilter : setBadgeFilter;
  const view = activeTab === 'dex' ? dexStats : activeTab === 'trophies' ? trophyStats : badgeStats;
  const accent = activeTab === 'dex' ? tab.accent : view.accent;
  const filterLabel = filters.find((item) => item.id === selectedFilter)?.label || 'All';

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab.id);
    requestAnimationFrame(() => {
      document.getElementById(`progress-tab-${nextTab.id}`)?.focus();
    });
  };

  return (
    <section className="home-progress-panel" aria-labelledby="home-progress-title">
      <div className="home-section-head">
        <div>
          <span className="home-eyebrow">Trainer progress</span>
          <h2 id="home-progress-title">Track what the filters reveal</h2>
          <p>Switch a tab, change the filter, and every count and bar updates with it.</p>
        </div>
        <Link className="home-text-link" to={tab.link}>
          {tab.cta} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="progress-tablist" role="tablist" aria-label="Trainer progress views">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`progress-tab-${item.id}`}
            aria-selected={activeTab === item.id}
            aria-controls="home-progress-panel"
            className={`progress-tab ${activeTab === item.id ? 'is-active' : ''}`}
            style={{ '--tab-accent': item.accent }}
            tabIndex={activeTab === item.id ? 0 : -1}
            onClick={() => setActiveTab(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, TABS.indexOf(item))}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id="home-progress-panel"
        role="tabpanel"
        aria-labelledby={`progress-tab-${activeTab}`}
        aria-busy={isLoading}
        className="progress-tabpanel"
      >
        <div className="progress-filter-chips" role="group" aria-label={`${tab.label} filters`}>
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`progress-filter ${selectedFilter === filter.id ? 'is-active' : ''}`}
              aria-pressed={selectedFilter === filter.id}
              onClick={() => setFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="progress-panel-content">
          <ProgressRing
            percent={isLoading ? 0 : view.percent}
            accent={accent}
            value={isLoading ? '—' : `${view.percent}%`}
            unit={activeTab === 'trophies' ? 'tier share' : 'complete'}
          />

          <div className="progress-panel-copy">
            <span className="progress-panel-kicker">
              {tab.label} · {filterLabel}
            </span>
            <h3>{isLoading ? 'Loading your progress…' : view.detail}</h3>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${isLoading ? 0 : view.percent}%`, background: accent }} />
            </div>
            <p>{view.description}</p>
            <Link className="progress-panel-link" to={tab.link}>
              {tab.cta} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

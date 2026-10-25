import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMatch } from '../store/matches';
import { SwordsIcon, UsersFriendsIcon, PokeballIcon, PokedexBookIcon, GamepadIcon } from '../components/icons/GameIcons';

const GAME_MODES = [
  {
    id: 'friend',
    title: '6v6 Friend Battle',
    status: 'Live',
    statusVariant: 'is-live',
    icon: SwordsIcon,
    variant: 'is-blue',
    description: 'Challenge accepted friends directly or create an open battle lobby link to share over WhatsApp or any direct URL.',
  },
  {
    id: 'guess',
    title: 'Guess Who?',
    status: 'Coming soon',
    statusVariant: 'is-coming',
    icon: PokeballIcon,
    variant: 'is-muted',
    description: 'Deduce your opponent\'s secret Pokemon by asking strategic questions about types, stats, and generations.',
    disabled: true,
  },
  {
    id: 'mystery',
    title: 'Mystery Draft',
    status: 'New',
    statusVariant: 'is-new',
    icon: PokedexBookIcon,
    variant: 'is-purple',
    description: 'A local party auction game. Queue 12 mystery Pokemon, reveal one clue at a time, then bid to draft a six-Pokemon team. Zero-dollar bids welcome.',
    path: '/mystery-draft',
    action: 'Start Mystery Draft',
  },
  {
    id: 'deal',
    title: 'Deal or No Deal',
    status: 'New',
    statusVariant: 'is-new',
    icon: PokeballIcon,
    variant: 'is-green',
    description: 'A local game-show draft with six rounds of themed mystery Pokeballs. Claim one, then decide whether to deal or swap it for a different closed ball.',
    path: '/deal-or-no-deal',
    action: 'Start Deal or No Deal',
  },
  {
    id: 'dex',
    title: 'Dex Battle',
    status: 'New',
    statusVariant: 'is-new',
    icon: PokeballIcon,
    variant: 'is-orange',
    description: 'A local party memory race. Race to name the Pokemon from its dex number, closest answer wins the card, first to six takes the round.',
    path: '/dex-battle',
    action: 'Start Dex Battle',
  },
  {
    id: 'friends',
    title: 'Trainer Friends',
    status: 'Social',
    statusVariant: 'is-social',
    icon: UsersFriendsIcon,
    variant: 'is-slate',
    description: 'Search for trainers, manage your friends list, check online status, and respond to incoming battle invites.',
    path: '/friends',
    action: 'Manage Friends List',
  },
];

export default function GameModes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreateShareableLink = async () => {
    setIsCreating(true);
    setCreateError('');
    try {
      const newMatch = await createMatch({
        mode: '6v6',
        userId: user?.id || 'guest',
      });
      navigate(`/match/${newMatch.id}`);
    } catch (err) {
      console.error('Error creating match link:', err);
      setCreateError('Could not create a match link. Check your connection and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-container home-page batch-page game-modes-page">
      <section className="ui-page-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow"><GamepadIcon size={18} /> Game Modes</span>
          <h1>Choose your next match.</h1>
          <p>
            Battle friends, share a live lobby, or jump into a local party mode. Every mode is built around your collection.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> 6 modes available</span>
            <span>Friend battles live</span>
            <span>Local party games</span>
          </div>
        </div>
        <div className="ui-hero-stat-card">
          <span className="ui-stat-eyebrow">Quick battle</span>
          <strong>6v6</strong>
          <p className="ui-stat-meta">Challenge a friend or create a shareable lobby link.</p>
          <button
            type="button"
            className="ui-btn primary"
            onClick={() => navigate('/friends')}
          >
            <SwordsIcon size={18} /> Find an opponent
          </button>
        </div>
      </section>

      {createError && (
        <div className="ui-state is-error is-inline" role="alert">
          <SwordsIcon size={28} />
          <div>
            <h3>Match link failed</h3>
            <p>{createError}</p>
          </div>
          <button type="button" className="ui-btn" onClick={() => setCreateError('')}>Dismiss</button>
        </div>
      )}

      <section className="ui-panel game-modes-panel" aria-labelledby="game-modes-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Mode select</span>
            <h2 id="game-modes-title">All game modes</h2>
            <p>Pick a mode to start. Unavailable modes are clearly marked and disabled.</p>
          </div>
        </div>

        <div className="game-modes-grid">
          {GAME_MODES.map((mode) => {
            const Icon = mode.icon;
            const isFriendMode = mode.id === 'friend';

            return (
              <article key={mode.id} className={`ui-mode-card ${mode.variant} ${mode.disabled ? 'is-disabled' : ''}`}>
                <div className="ui-mode-card-top">
                  <span className="ui-mode-icon"><Icon size={30} /></span>
                  <span className={`ui-badge ${mode.statusVariant}`}>{mode.status}</span>
                </div>

                <div>
                  <h3>{mode.title}</h3>
                  <p>{mode.description}</p>
                </div>

                {isFriendMode ? (
                  <div className="ui-mode-actions">
                    <button
                      type="button"
                      className="ui-btn primary"
                      onClick={() => navigate('/friends')}
                    >
                      <SwordsIcon size={18} /> Challenge a Friend
                    </button>
                    <button
                      type="button"
                      className="ui-btn"
                      onClick={handleCreateShareableLink}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating link...' : 'Share via WhatsApp / URL'}
                    </button>
                  </div>
                ) : mode.disabled ? (
                  <button type="button" className="ui-btn" disabled>
                    Coming in a future phase
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ui-btn primary"
                    onClick={() => navigate(mode.path)}
                  >
                    {mode.action}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

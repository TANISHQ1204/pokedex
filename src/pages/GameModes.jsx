import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMatch } from '../store/matches';
import { SwordsIcon, UsersFriendsIcon, PokeballIcon } from '../components/icons/GameIcons';

export default function GameModes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateShareableLink = async () => {
    setIsCreating(true);
    try {
      const newMatch = await createMatch({
        mode: '6v6',
        userId: user?.id || 'guest',
      });
      navigate(`/match/${newMatch.id}`);
    } catch (err) {
      console.error('Error creating match link:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
          Game Modes Hub
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', margin: 0 }}>
          Choose your favorite battle mode, challenge friends, or share live match links.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Mode 1: 6v6 Friend Battles */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2rem 1.5rem',
            border: '2px solid #0284c7',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.25)',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                padding: '0.75rem',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                marginBottom: '1rem',
              }}
            >
              <SwordsIcon size={32} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                6v6 Friend Battle
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: '#16a34a',
                  color: '#a7f3d0',
                }}
              >
                LIVE
              </span>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Challenge accepted friends directly or create an open battle lobby link to share over WhatsApp or direct URL.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/friends')}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              ⚔️ Challenge a Friend
            </button>

            <button
              onClick={handleCreateShareableLink}
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #38bdf8',
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: isCreating ? 'not-allowed' : 'pointer',
              }}
            >
              {isCreating ? 'Creating Link...' : '📲 Share via WhatsApp / URL'}
            </button>
          </div>
        </div>

        {/* Mode 2: Guess Who (Coming Soon) */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2rem 1.5rem',
            border: '2px dashed #475569',
            backgroundColor: '#0f172a',
            opacity: 0.85,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                padding: '0.75rem',
                borderRadius: '50%',
                backgroundColor: '#334155',
                color: '#f59e0b',
                marginBottom: '1rem',
              }}
            >
              <PokeballIcon size={32} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#cbd5e1', margin: 0 }}>
                Guess Who?
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: '#451a03',
                  color: '#fef08a',
                  border: '1px solid #b45309',
                }}
              >
                COMING SOON
              </span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Deduce your opponent's secret Pokémon by asking strategic questions about types, stats, and generations!
            </p>
          </div>

          <button
            disabled
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#334155',
              color: '#64748b',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'not-allowed',
            }}
          >
            🔒 Phase 5 - Under Construction
          </button>
        </div>

        {/* Mode 3: Trainer Friends & Invites */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2rem 1.5rem',
            border: '2px solid #334155',
            backgroundColor: '#1e293b',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                padding: '0.75rem',
                borderRadius: '50%',
                backgroundColor: '#334155',
                color: '#38bdf8',
                marginBottom: '1rem',
              }}
            >
              <UsersFriendsIcon size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              Trainer Friends
            </h2>

            <p style={{ color: '#cbd5e1', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Search for trainers by username, manage your friends list, check live online status, and respond to incoming battle invites.
            </p>
          </div>

          <button
            onClick={() => navigate('/friends')}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            👥 Manage Friends List
          </button>
        </div>
      </div>
    </div>
  );
}

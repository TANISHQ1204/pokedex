import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../store/supabaseClient';
import { useMatchSubscription } from '../store/matches';
import { SwordsIcon, PokeballIcon } from '../components/icons/GameIcons';

export default function MatchLobby() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, profile, isConfigured } = useAuth();

  const { match, loading, error } = useMatchSubscription(matchId, user?.id);

  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  // Fetch usernames for host and guest
  useEffect(() => {
    if (!match) return;

    let isMounted = true;

    const fetchNames = async () => {
      const userIds = [match.player_1_id, match.player_2_id].filter(Boolean);
      if (userIds.length === 0) return;

      if (isConfigured) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);

        if (profiles && isMounted) {
          const map = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.username;
            return acc;
          }, {});

          if (match.player_1_id) setPlayer1Name(map[match.player_1_id] || 'Challenger');
          if (match.player_2_id) setPlayer2Name(map[match.player_2_id] || 'Opponent');
        }
      } else {
        // Fallback names for mock mode
        if (isMounted) {
          setPlayer1Name(match.player_1_id === user?.id ? profile?.username || 'You' : 'ash_ketchum');
          setPlayer2Name(match.player_2_id === user?.id ? profile?.username || 'You' : 'misty_water');
        }
      }
    };

    fetchNames();

    return () => {
      isMounted = false;
    };
  }, [match, isConfigured, user?.id, profile?.username]);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Connecting to Battle Lobby...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Match Not Found</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            {error || 'This battle match does not exist or has expired.'}
          </p>
          <button
            onClick={() => navigate('/friends')}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Return to Friends
          </button>
        </div>
      </div>
    );
  }

  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/join/${matchId}`;

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Join my 6v6 Pokémon Battle in PokéDex League! ⚔️\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = match.player_1_id === user?.id;
  const isGuest = match.player_2_id === user?.id;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header Badge */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '0.75rem',
            borderRadius: '50%',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            marginBottom: '0.75rem',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
          }}
        >
          <SwordsIcon size={40} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
          {match.mode ? match.mode.toUpperCase() : '6V6'} Battle Lobby
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
          Match ID: <code style={{ color: '#38bdf8' }}>{match.id}</code>
        </p>
      </div>

      {/* Match Status Card */}
      {match.status === 'waiting' && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            border: '2px dashed #0284c7',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem auto',
              borderRadius: '50%',
              border: '3px solid #38bdf8',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
            }}
          />
          <h2 style={{ fontSize: '1.35rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
            {isHost ? 'Waiting for an Opponent to Join...' : `Waiting for @${player2Name || 'friend'} to accept...`}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Share this battle link with anyone on WhatsApp or via direct URL!
          </p>

          {/* WhatsApp / Copy Link Box */}
          <div
            style={{
              backgroundColor: '#0f172a',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #334155',
              maxWidth: '550px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                color: '#38bdf8',
                wordBreak: 'break-all',
                marginBottom: '1rem',
                fontWeight: 600,
                padding: '0.5rem',
                backgroundColor: '#1e293b',
                borderRadius: '0.25rem',
              }}
            >
              {shareUrl}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleShareWhatsApp}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 0 12px rgba(37, 211, 102, 0.4)',
                }}
              >
                📲 Share via WhatsApp
              </button>

              <button
                onClick={handleCopyLink}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #475569',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}


      {match.status === 'abandoned' && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            border: '2px solid #dc2626',
            backgroundColor: '#450a0a',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.35rem', color: '#fca5a5', marginBottom: '0.5rem' }}>
            Challenge Declined
          </h2>
          <p style={{ color: '#fecaca', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            This battle challenge was declined or cancelled.
          </p>
          <button
            onClick={() => navigate('/friends')}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Back to Friends
          </button>
        </div>
      )}

      {/* VS Matchup Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '1.5rem',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        {/* Player 1 Card */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            border: '2px solid #0284c7',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem auto',
              borderRadius: '50%',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              border: '3px solid #38bdf8',
            }}
          >
            {player1Name ? player1Name.charAt(0).toUpperCase() : '1'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
            Challenger (Host)
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            @{player1Name || 'Trainer_1'}
          </div>
          {isHost && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                borderRadius: '0.25rem',
                backgroundColor: '#0369a1',
                color: '#e0f2fe',
              }}
            >
              You
            </span>
          )}
        </div>

        {/* VS Badge */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)',
              margin: '0 auto',
            }}
          >
            VS
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            border: '2px solid #f59e0b',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem auto',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              border: '3px solid #fef08a',
            }}
          >
            {player2Name ? player2Name.charAt(0).toUpperCase() : '2'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
            Opponent (Guest)
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            @{player2Name || 'Waiting...'}
          </div>
          {isGuest && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                borderRadius: '0.25rem',
                backgroundColor: '#b45309',
                color: '#fef3c7',
              }}
            >
              You
            </span>
          )}
        </div>
      </div>

      {/* Active Battle Placeholder Banner */}
      {match.status === 'active' && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '2rem',
            border: '2px solid #16a34a',
            backgroundColor: '#064e3b',
            color: '#a7f3d0',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
            <PokeballIcon size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
            Match Started! @{player1Name} vs @{player2Name}
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#d1fae5', margin: 0 }}>
            Real-time battle lobby established successfully. Full 6v6 turn-based battle engine integration will take place in Phase 4!
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/friends')}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            border: '1px solid #475569',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Friends
        </button>
        <button
          onClick={() => navigate('/home')}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

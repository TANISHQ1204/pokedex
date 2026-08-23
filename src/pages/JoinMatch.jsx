import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../store/supabaseClient';
import { fetchMatch, joinMatch } from '../store/matches';
import { SwordsIcon, PokeballIcon } from '../components/icons/GameIcons';

export default function JoinMatch() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, profile, session, loading, isConfigured } = useAuth();

  const [matchData, setMatchData] = useState(null);
  const [creatorName, setCreatorName] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // If auth state is still loading, wait
    if (loading) return;

    // 1. Unauthenticated Visitor Handling
    if (!session && isConfigured) {
      sessionStorage.setItem('post_login_redirect', `/join/${matchId}`);
      navigate('/login', { replace: true });
      return;
    }

    let isMounted = true;

    const loadMatchInfo = async () => {
      setIsFetching(true);
      setErrorMsg('');

      try {
        const data = await fetchMatch(matchId);
        if (!isMounted) return;

        if (!data) {
          setErrorMsg('Match not found or has been deleted.');
          setIsFetching(false);
          return;
        }

        setMatchData(data);

        // Case A: Current user is host (player 1) or already guest (player 2)
        if (user && (data.player_1_id === user.id || data.player_2_id === user.id)) {
          navigate(`/match/${matchId}`, { replace: true });
          return;
        }

        // Fetch Creator's username
        if (data.player_1_id) {
          if (isConfigured) {
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', data.player_1_id)
              .maybeSingle();

            if (creatorProfile && isMounted) {
              setCreatorName(creatorProfile.username);
            }
          } else {
            if (isMounted) setCreatorName('ash_ketchum');
          }
        }
      } catch (err) {
        console.error('Error fetching match for join:', err);
        if (isMounted) setErrorMsg('Failed to load match details.');
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    loadMatchInfo();

    return () => {
      isMounted = false;
    };
  }, [matchId, session, user, loading, isConfigured, navigate]);

  const handleJoinBattle = async () => {
    if (!matchId || !user?.id) return;
    setIsJoining(true);
    setErrorMsg('');

    try {
      await joinMatch(matchId, user.id);
      navigate(`/match/${matchId}`, { replace: true });
    } catch (err) {
      console.error('Failed to join match:', err);
      setErrorMsg(err.message || 'Could not join match.');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading || isFetching) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Loading battle invitation...</p>
      </div>
    );
  }

  if (errorMsg || !matchData) {
    return (
      <div className="page-container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Invitation Unavailable</h2>
          <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
            {errorMsg || 'This match link is invalid or no longer exists.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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
      </div>
    );
  }

  // Edge Case: Match is already full (player_2_id is set) or status is not 'waiting'
  const isMatchFull = Boolean(matchData.player_2_id) || matchData.status !== 'waiting';

  if (isMatchFull) {
    return (
      <div className="page-container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            border: '2px solid #f59e0b',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚔️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fef08a', marginBottom: '0.5rem' }}>
            This Match is Full!
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Another trainer has already joined this battle lobby. You can return to Home or create your own shareable battle link!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/home')}
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
              Go to Home
            </button>
            <button
              onClick={() => navigate('/battle')}
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
              Start Your Own Battle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case D: Available Match - Show Confirmation Screen
  return (
    <div className="page-container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          border: '2px solid #38bdf8',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.6), 0 0 25px rgba(56, 189, 248, 0.35)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '50%',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
          }}
        >
          <SwordsIcon size={48} />
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Battle Invitation
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '0.5rem 0' }}>
          @{creatorName || 'A Trainer'} Invited You!
        </h1>

        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          You have been challenged to a <strong style={{ color: '#f59e0b' }}>{matchData.mode || '6v6'} Pokémon Battle</strong> in the PokéDex League. Click below to accept and enter the arena!
        </p>

        <button
          onClick={handleJoinBattle}
          disabled={isJoining}
          style={{
            width: '100%',
            padding: '0.875rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            fontSize: '1.1rem',
            fontWeight: 800,
            cursor: isJoining ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
            transition: 'transform 0.15s ease',
          }}
        >
          {isJoining ? 'Entering Battle...' : '⚔️ Join Battle Now'}
        </button>

        <div style={{ marginTop: '1.25rem' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Decline & Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

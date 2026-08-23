import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../store/supabaseClient';
import {
  fetchPendingInvites,
  subscribeToIncomingInvites,
  acceptChallenge,
  declineChallenge,
} from '../store/matches';
import { SwordsIcon } from './icons/GameIcons';

export default function MatchInviteBanner() {
  const { user, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [invites, setInvites] = useState([]);
  const [challengerNames, setChallengerNames] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setInvites([]);
      return;
    }

    let isMounted = true;

    const loadInvites = async () => {
      const data = await fetchPendingInvites(user.id);
      if (!isMounted) return;
      setInvites(data || []);

      if (data && data.length > 0) {
        const challengerIds = [...new Set(data.map((i) => i.player_1_id))];
        if (isConfigured) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username')
            .in('user_id', challengerIds);

          if (profiles && isMounted) {
            const map = profiles.reduce((acc, p) => {
              acc[p.user_id] = p.username;
              return acc;
            }, {});
            setChallengerNames(map);
          }
        } else {
          // Mock names for preview mode
          setChallengerNames({ 'mock-user-1': 'ash_ketchum', 'mock-user-2': 'misty_water' });
        }
      }
    };

    loadInvites();

    const unsubscribe = subscribeToIncomingInvites(user.id, (updatedInvite) => {
      if (!isMounted) return;
      if (updatedInvite.status === 'waiting') {
        setInvites((prev) => {
          const exists = prev.some((i) => i.id === updatedInvite.id);
          if (exists) {
            return prev.map((i) => (i.id === updatedInvite.id ? updatedInvite : i));
          }
          return [updatedInvite, ...prev];
        });
      } else {
        setInvites((prev) => prev.filter((i) => i.id !== updatedInvite.id));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id, isConfigured]);

  const handleAccept = async (invite) => {
    setProcessingId(invite.id);
    try {
      await acceptChallenge(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      navigate(`/match/${invite.id}`);
    } catch (err) {
      console.error('Failed to accept challenge:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invite) => {
    setProcessingId(invite.id);
    try {
      await declineChallenge(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      console.error('Failed to decline challenge:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (!invites || invites.length === 0) return null;

  const currentInvite = invites[0];
  const challengerUsername = challengerNames[currentInvite.player_1_id] || 'Trainer';

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        backgroundColor: '#0f172a',
        borderBottom: '2px solid #38bdf8',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.3)',
        padding: '0.75rem 1.5rem',
        animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.4rem',
              borderRadius: '50%',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SwordsIcon size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem' }}>
              Battle Challenge Incoming!
            </div>
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>@{challengerUsername}</span> challenged you to a{' '}
              <strong style={{ color: '#f59e0b' }}>{currentInvite.mode || '6v6'} Battle</strong>!
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => handleAccept(currentInvite)}
            disabled={processingId === currentInvite.id}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
              transition: 'transform 0.15s ease',
            }}
          >
            {processingId === currentInvite.id ? 'Joining...' : 'Accept Challenge'}
          </button>
          <button
            onClick={() => handleDecline(currentInvite)}
            disabled={processingId === currentInvite.id}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #475569',
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

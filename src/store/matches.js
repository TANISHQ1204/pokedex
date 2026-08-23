import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const MOCK_MATCHES_KEY = 'pokedex_mock_matches_store';
const BROADCAST_CHANNEL_NAME = 'pokedex_matches_realtime_channel';

// Helper for local broadcast fallback when Supabase isn't configured
const getBroadcastChannel = () => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
  return null;
};

// 1. Create Match
export async function createMatch({ mode = 'test', initialState = {}, userId }) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const mockId = `mock-match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockMatch = {
      id: mockId,
      mode,
      player_1_id: userId || 'mock-player-1',
      player_2_id: null,
      status: 'waiting',
      state: initialState,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    matchesMap[mockId] = mockMatch;
    localStorage.setItem(MOCK_MATCHES_KEY, JSON.stringify(matchesMap));

    const bc = getBroadcastChannel();
    bc?.postMessage({ type: 'MATCH_UPDATED', match: mockMatch });

    return mockMatch;
  }

  const { data, error } = await supabase
    .from('matches')
    .insert([
      {
        mode,
        player_1_id: userId,
        status: 'waiting',
        state: initialState,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating match:', error.message);
    throw new Error(error.message || 'Failed to create match.');
  }

  return data;
}

// 2. Fetch Match
export async function fetchMatch(matchId) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    return matchesMap[matchId] || null;
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (error) {
    console.error('Error fetching match:', error.message);
    return null;
  }

  return data;
}

// 3. Join Match
export async function joinMatch(matchId, userId) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    const existing = matchesMap[matchId];
    if (!existing) throw new Error('Match not found.');

    const updated = {
      ...existing,
      player_2_id: userId || 'mock-player-2',
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    matchesMap[matchId] = updated;
    localStorage.setItem(MOCK_MATCHES_KEY, JSON.stringify(matchesMap));

    const bc = getBroadcastChannel();
    bc?.postMessage({ type: 'MATCH_UPDATED', match: updated });
    return updated;
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      player_2_id: userId,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('Error joining match:', error.message);
    throw new Error(error.message || 'Failed to join match.');
  }

  return data;
}

// 4. Update Match State
export async function updateMatchState(matchId, newState) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    const existing = matchesMap[matchId];
    if (!existing) throw new Error('Match not found.');

    const updated = {
      ...existing,
      state: newState,
      updated_at: new Date().toISOString(),
    };
    matchesMap[matchId] = updated;
    localStorage.setItem(MOCK_MATCHES_KEY, JSON.stringify(matchesMap));

    const bc = getBroadcastChannel();
    bc?.postMessage({ type: 'MATCH_UPDATED', match: updated });
    return updated;
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      state: newState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating match state:', error.message);
    throw new Error(error.message || 'Failed to update match state.');
  }

  return data;
}

// 5. Realtime Subscription Helper
export function subscribeToMatch(matchId, onUpdate) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const bc = getBroadcastChannel();
    const handleBroadcast = (event) => {
      if (event.data?.type === 'MATCH_UPDATED' && event.data.match?.id === matchId) {
        onUpdate(event.data.match);
      }
    };
    bc?.addEventListener('message', handleBroadcast);

    const handleStorage = (event) => {
      if (event.key === MOCK_MATCHES_KEY && event.newValue) {
        const matchesMap = JSON.parse(event.newValue);
        if (matchesMap[matchId]) {
          onUpdate(matchesMap[matchId]);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      bc?.removeEventListener('message', handleBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // Supabase Realtime channel subscription
  const channel = supabase
    .channel(`match_room:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to realtime updates for match ${matchId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// 6. Challenge Friend
export async function challengeFriend({ challengerId, friendId, mode = '6v6', initialState = {} }) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const mockId = `mock-match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockMatch = {
      id: mockId,
      mode,
      player_1_id: challengerId,
      player_2_id: friendId,
      status: 'waiting',
      state: initialState,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    matchesMap[mockId] = mockMatch;
    localStorage.setItem(MOCK_MATCHES_KEY, JSON.stringify(matchesMap));

    const bc = getBroadcastChannel();
    bc?.postMessage({ type: 'MATCH_INVITE', match: mockMatch });
    bc?.postMessage({ type: 'MATCH_UPDATED', match: mockMatch });

    return mockMatch;
  }

  const { data, error } = await supabase
    .from('matches')
    .insert([
      {
        mode,
        player_1_id: challengerId,
        player_2_id: friendId,
        status: 'waiting',
        state: initialState,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating challenge:', error.message);
    throw new Error(error.message || 'Failed to send battle challenge.');
  }

  return data;
}

// 7. Accept Challenge
export async function acceptChallenge(matchId) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    const existing = matchesMap[matchId];
    if (!existing) throw new Error('Match not found.');

    const updated = {
      ...existing,
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    matchesMap[matchId] = updated;
    localStorage.setItem(MOCK_MATCHES_KEY, JSON.stringify(matchesMap));

    const bc = getBroadcastChannel();
    bc?.postMessage({ type: 'MATCH_UPDATED', match: updated });
    return updated;
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('Error accepting challenge:', error.message);
    throw new Error(error.message || 'Failed to accept challenge.');
  }

  return data;
}

// 8. Decline Challenge
export async function declineChallenge(matchId) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    const existing = matchesMap[matchId];
    if (!existing) throw new Error('Match not found.');

    const updated = {
      ...existing,
      status: 'abandoned',
      updated_at: new Date().toISOString(),
    };
    matchesMap[matchId] = updated;
    localStorage.setItem(MOCK_MATCHES_KEY, JSON.stringify(matchesMap));

    const bc = getBroadcastChannel();
    bc?.postMessage({ type: 'MATCH_UPDATED', match: updated });
    return updated;
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      status: 'abandoned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('Error declining challenge:', error.message);
    throw new Error(error.message || 'Failed to decline challenge.');
  }

  return data;
}

// 9. Fetch Pending Invites
export async function fetchPendingInvites(userId) {
  if (!userId) return [];
  const configured = isSupabaseConfigured();

  if (!configured) {
    const raw = localStorage.getItem(MOCK_MATCHES_KEY);
    const matchesMap = raw ? JSON.parse(raw) : {};
    return Object.values(matchesMap).filter(
      (m) => m.player_2_id === userId && m.status === 'waiting'
    );
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('player_2_id', userId)
    .eq('status', 'waiting');

  if (error) {
    console.error('Error fetching pending invites:', error.message);
    return [];
  }

  return data || [];
}

// 10. Subscribe to Incoming Match Invites
export function subscribeToIncomingInvites(userId, onInviteUpdate) {
  if (!userId) return () => {};
  const configured = isSupabaseConfigured();

  if (!configured) {
    const bc = getBroadcastChannel();
    const handleBroadcast = (event) => {
      if (
        (event.data?.type === 'MATCH_INVITE' || event.data?.type === 'MATCH_UPDATED') &&
        event.data.match?.player_2_id === userId
      ) {
        onInviteUpdate(event.data.match);
      }
    };
    bc?.addEventListener('message', handleBroadcast);

    const handleStorage = (event) => {
      if (event.key === MOCK_MATCHES_KEY && event.newValue) {
        const matchesMap = JSON.parse(event.newValue);
        const userInvites = Object.values(matchesMap).filter(
          (m) => m.player_2_id === userId && m.status === 'waiting'
        );
        userInvites.forEach(onInviteUpdate);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      bc?.removeEventListener('message', handleBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  const channel = supabase
    .channel(`user_invites:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `player_2_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onInviteUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// React Hook for Subscribing to a Match
export function useMatchSubscription(matchId, userId) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadMatch = useCallback(async () => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMatch(matchId);
      setMatch(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;

    reloadMatch();

    const unsubscribe = subscribeToMatch(matchId, (updatedMatch) => {
      setMatch(updatedMatch);
    });

    return () => {
      unsubscribe();
    };
  }, [matchId, reloadMatch]);

  const updateState = async (newState) => {
    if (!matchId) return;
    const updated = await updateMatchState(matchId, newState);
    setMatch(updated);
    return updated;
  };

  const join = async () => {
    if (!matchId || !userId) return;
    const updated = await joinMatch(matchId, userId);
    setMatch(updated);
    return updated;
  };

  return {
    match,
    loading,
    error,
    reloadMatch,
    updateState,
    join,
  };
}


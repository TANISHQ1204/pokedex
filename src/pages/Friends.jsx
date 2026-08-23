import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../store/supabaseClient';
import { challengeFriend } from '../store/matches';
import { UsersFriendsIcon, PokeballIcon } from '../components/icons/GameIcons';

export default function Friends() {
  const { user, profile, onlineUserIds, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [allMyFriendships, setAllMyFriendships] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Challenge Friend Handler
  const handleChallengeFriend = async (friend) => {
    if (!user?.id) return;
    setActionError('');
    try {
      const newMatch = await challengeFriend({
        challengerId: user.id,
        friendId: friend.userId,
        mode: '6v6',
      });
      navigate(`/match/${newMatch.id}`);
    } catch (err) {
      console.error('Challenge error:', err);
      setActionError(err.message || 'Failed to send battle challenge.');
    }
  };


  // Local storage mock key for non-configured preview mode
  const MOCK_STORAGE_KEY = 'pokedex_mock_friendships';

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingLists(true);
    setActionError('');

    if (!isConfigured) {
      // Mock storage for preview mode
      const raw = localStorage.getItem(MOCK_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [
        { id: 'mock-1', user_id: 'mock-user-2', friend_id: user.id, status: 'pending', sender_username: 'misty_water' },
        { id: 'mock-2', user_id: user.id, friend_id: 'mock-user-3', status: 'accepted', friend_username: 'brock_rock' }
      ];
      setAllMyFriendships(list);

      const incoming = list.filter((f) => f.friend_id === user.id && f.status === 'pending');
      setPendingRequests(
        incoming.map((f) => ({
          friendshipId: f.id,
          userId: f.user_id,
          username: f.sender_username || 'Trainer_Misty',
        }))
      );

      const accepted = list.filter((f) => (f.user_id === user.id || f.friend_id === user.id) && f.status === 'accepted');
      setFriendsList(
        accepted.map((f) => ({
          friendshipId: f.id,
          userId: f.user_id === user.id ? f.friend_id : f.user_id,
          username: f.friend_username || (f.user_id === user.id ? 'brock_rock' : 'oak_prof'),
        }))
      );
      setLoadingLists(false);
      return;
    }

    try {
      // Fetch all friendship records where logged in user is sender or receiver
      const { data: friendships, error: fetchErr } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (fetchErr) throw fetchErr;

      setAllMyFriendships(friendships || []);

      // 1. Pending incoming requests (friend_id === user.id)
      const incomingRows = (friendships || []).filter((f) => f.friend_id === user.id && f.status === 'pending');
      if (incomingRows.length > 0) {
        const senderIds = incomingRows.map((f) => f.user_id);
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', senderIds);

        const profileMap = (senderProfiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.username;
          return acc;
        }, {});

        setPendingRequests(
          incomingRows.map((f) => ({
            friendshipId: f.id,
            userId: f.user_id,
            username: profileMap[f.user_id] || 'Unknown Trainer',
          }))
        );
      } else {
        setPendingRequests([]);
      }

      // 2. Accepted friends list
      const acceptedRows = (friendships || []).filter(
        (f) => (f.user_id === user.id || f.friend_id === user.id) && f.status === 'accepted'
      );
      if (acceptedRows.length > 0) {
        const friendUserIds = acceptedRows.map((f) => (f.user_id === user.id ? f.friend_id : f.user_id));
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', friendUserIds);

        const profileMap = (friendProfiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.username;
          return acc;
        }, {});

        setFriendsList(
          acceptedRows.map((f) => {
            const fid = f.user_id === user.id ? f.friend_id : f.user_id;
            return {
              friendshipId: f.id,
              userId: fid,
              username: profileMap[fid] || 'Trainer',
            };
          })
        );
      } else {
        setFriendsList([]);
      }
    } catch (err) {
      console.error('Error loading friends data:', err);
      setActionError('Failed to load friends list.');
    } finally {
      setLoadingLists(false);
    }
  }, [user, isConfigured]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search logic
  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    if (!isConfigured) {
      // Mock search for preview
      setTimeout(() => {
        if (query.toLowerCase() === profile?.username?.toLowerCase()) {
          setSearchResults([]);
          setSearchError("You cannot add yourself as a friend.");
        } else {
          setSearchResults([
            { user_id: 'mock-user-4', username: query },
          ]);
        }
        setIsSearching(false);
      }, 300);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .ilike('username', `%${query}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        setSearchError(`No trainer found matching "${query}".`);
        setSearchResults([]);
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Error performing search.');
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to determine relationship state with a target user
  const getRelationship = (targetUserId) => {
    const row = allMyFriendships.find(
      (f) => (f.user_id === user.id && f.friend_id === targetUserId) ||
             (f.user_id === targetUserId && f.friend_id === user.id)
    );
    if (!row) return { type: 'none' };
    if (row.status === 'accepted') return { type: 'accepted', id: row.id };
    if (row.user_id === user.id) return { type: 'pending_sent', id: row.id };
    return { type: 'pending_received', id: row.id };
  };

  // Actions
  const sendFriendRequest = async (targetUser) => {
    setActionError('');
    setActionSuccess('');

    if (!isConfigured) {
      const mockRow = {
        id: `mock-${Date.now()}`,
        user_id: user.id,
        friend_id: targetUser.user_id,
        status: 'pending',
        friend_username: targetUser.username,
      };
      const updated = [...allMyFriendships, mockRow];
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
      setAllMyFriendships(updated);
      setActionSuccess(`Friend request sent to @${targetUser.username}!`);
      return;
    }

    try {
      const { error } = await supabase.from('friendships').insert([
        {
          user_id: user.id,
          friend_id: targetUser.user_id,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      setActionSuccess(`Friend request sent to @${targetUser.username}!`);
      await loadData();
    } catch (err) {
      console.error('Failed to send request:', err);
      setActionError(err.message || 'Could not send friend request.');
    }
  };

  const acceptRequest = async (friendshipId, username) => {
    setActionError('');
    setActionSuccess('');

    if (!isConfigured) {
      const updated = allMyFriendships.map((f) => (f.id === friendshipId ? { ...f, status: 'accepted' } : f));
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
      setActionSuccess(`You are now friends with @${username}!`);
      await loadData();
      return;
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      setActionSuccess(`You are now friends with @${username}!`);
      await loadData();
    } catch (err) {
      console.error('Accept error:', err);
      setActionError('Failed to accept request.');
    }
  };

  const declineRequest = async (friendshipId) => {
    setActionError('');

    if (!isConfigured) {
      const updated = allMyFriendships.filter((f) => f.id !== friendshipId);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
      await loadData();
      return;
    }

    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Decline error:', err);
      setActionError('Failed to decline request.');
    }
  };

  const removeFriend = async (friendshipId, username) => {
    if (!window.confirm(`Are you sure you want to remove @${username} from your friends list?`)) return;

    setActionError('');
    setActionSuccess('');

    if (!isConfigured) {
      const updated = allMyFriendships.filter((f) => f.id !== friendshipId);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
      await loadData();
      return;
    }

    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      setActionSuccess(`Removed @${username} from friends.`);
      await loadData();
    } catch (err) {
      console.error('Remove error:', err);
      setActionError('Failed to remove friend.');
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <UsersFriendsIcon size={32} />
        <h1 style={{ color: '#f8fafc', margin: 0 }}>Trainer Friends</h1>
      </div>

      {actionError && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#450a0a',
            border: '1px solid #b91c1c',
            borderRadius: '0.5rem',
            color: '#fca5a5',
          }}
        >
          ⚠️ {actionError}
        </div>
      )}

      {actionSuccess && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#064e3b',
            border: '1px solid #059669',
            borderRadius: '0.5rem',
            color: '#a7f3d0',
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}

      {/* 1. Search Bar Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', color: '#f8fafc' }}>
          Find Trainers
        </h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username..."
            style={{
              flex: 1,
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
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
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError && <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>{searchError}</p>}

        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {searchResults.map((resUser) => {
              const rel = getRelationship(resUser.user_id);
              return (
                <div
                  key={resUser.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {resUser.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem' }}>
                      @{resUser.username}
                    </span>
                  </div>

                  <div>
                    {rel.type === 'none' && (
                      <button
                        onClick={() => sendFriendRequest(resUser)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        + Add Friend
                      </button>
                    )}
                    {rel.type === 'pending_sent' && (
                      <span
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.375rem',
                          backgroundColor: '#1e293b',
                          color: '#94a3b8',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          border: '1px solid #334155',
                        }}
                      >
                        Request Sent
                      </span>
                    )}
                    {rel.type === 'pending_received' && (
                      <span
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.375rem',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        Pending Request
                      </span>
                    )}
                    {rel.type === 'accepted' && (
                      <span
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.375rem',
                          backgroundColor: '#065f46',
                          color: '#a7f3d0',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        Friends ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Pending Requests Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', color: '#f8fafc' }}>
          Pending Requests ({pendingRequests.length})
        </h2>

        {loadingLists ? (
          <p style={{ color: '#94a3b8' }}>Loading requests...</p>
        ) : pendingRequests.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No incoming friend requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingRequests.map((req) => (
              <div
                key={req.friendshipId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {req.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>@{req.username}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => acceptRequest(req.friendshipId, req.username)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineRequest(req.friendshipId)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Friends List Section */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', color: '#f8fafc' }}>
          Your Friends ({friendsList.length})
        </h2>

        {loadingLists ? (
          <p style={{ color: '#94a3b8' }}>Loading friends...</p>
        ) : friendsList.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>You have no added friends yet. Use the search bar above to find trainers!</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1rem',
            }}
          >
            {friendsList.map((friend) => {
              const isOnline = Boolean(onlineUserIds && onlineUserIds[friend.userId]);
              return (
                <div
                  key={friend.friendshipId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          border: '2px solid #38bdf8',
                        }}
                      >
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#22c55e' : '#64748b',
                          border: '2px solid #0f172a',
                          boxShadow: isOnline ? '0 0 8px #22c55e' : 'none',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                        @{friend.username}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: isOnline ? '#4ade80' : '#94a3b8', fontWeight: 600 }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleChallengeFriend(friend)}
                      title="Challenge to 6v6 Battle"
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        boxShadow: '0 0 10px rgba(220, 38, 38, 0.4)',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      ⚔️ Challenge
                    </button>
                    <button
                      onClick={() => removeFriend(friend.friendshipId, friend.username)}
                      title="Remove friend"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '0.25rem',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.target.style.color = '#64748b')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}


          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../store/supabaseClient';
import { challengeFriend } from '../store/matches';
import { UsersFriendsIcon, SwordsIcon, SparkleStarIcon } from '../components/icons/GameIcons';

const MOCK_STORAGE_KEY = 'pokedex_mock_friendships';

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
  const [challengingId, setChallengingId] = useState(null);

  const handleChallengeFriend = async (friend) => {
    if (!user?.id) return;
    setActionError('');
    setChallengingId(friend.friendshipId);
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
    } finally {
      setChallengingId(null);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) {
      setLoadingLists(false);
      return;
    }
    setLoadingLists(true);
    setActionError('');

    if (!isConfigured) {
      const raw = localStorage.getItem(MOCK_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [
        { id: 'mock-1', user_id: 'mock-user-2', friend_id: user.id, status: 'pending', sender_username: 'misty_water' },
        { id: 'mock-2', user_id: user.id, friend_id: 'mock-user-3', status: 'accepted', friend_username: 'brock_rock' },
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
      const { data: friendships, error: fetchErr } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (fetchErr) throw fetchErr;

      setAllMyFriendships(friendships || []);

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
  }, [user, isConfigured, MOCK_STORAGE_KEY]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      setTimeout(() => {
        if (query.toLowerCase() === profile?.username?.toLowerCase()) {
          setSearchResults([]);
          setSearchError('You cannot add yourself as a friend.');
        } else {
          setSearchResults([{ user_id: 'mock-user-4', username: query }]);
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
      setActionSuccess(`Friend request sent to @${targetUser.username}.`);
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

      setActionSuccess(`Friend request sent to @${targetUser.username}.`);
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
      setActionSuccess(`You are now friends with @${username}.`);
      await loadData();
      return;
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      setActionSuccess(`You are now friends with @${username}.`);
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

  const onlineCount = friendsList.filter((friend) => Boolean(onlineUserIds && onlineUserIds[friend.userId])).length;

  return (
    <div className="page-container home-page batch-page friends-page">
      <section className="ui-page-hero">
        <div className="ui-page-hero-copy">
          <span className="home-eyebrow"><UsersFriendsIcon size={18} /> Trainer Network</span>
          <h1>Build your battle circle.</h1>
          <p>
            Find trainers, accept requests, see who is online, and challenge friends to a live 6v6 match.
          </p>
          <div className="home-hero-meta">
            <span><span className="home-status-dot" /> {onlineCount} online now</span>
            <span>{friendsList.length} friends</span>
            <span>{pendingRequests.length} pending</span>
          </div>
        </div>
        <div className="ui-hero-stat-card">
          <span className="ui-stat-eyebrow">Your network</span>
          <strong>{friendsList.length}</strong>
          <p className="ui-stat-meta">{onlineCount} friend{onlineCount === 1 ? '' : 's'} online right now.</p>
          {!isConfigured && <small>Preview mode uses local sample friends.</small>}
        </div>
      </section>

      {actionError && (
        <div className="ui-alert is-error" role="alert">
          <span>{actionError}</span>
          <button type="button" className="ui-text-btn" onClick={() => setActionError('')}>Dismiss</button>
        </div>
      )}

      {actionSuccess && (
        <div className="ui-alert is-success" role="status">
          <span>{actionSuccess}</span>
          <button type="button" className="ui-text-btn" onClick={() => setActionSuccess('')}>Dismiss</button>
        </div>
      )}

      <section className="ui-panel friends-search-panel" aria-labelledby="find-trainers-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Search</span>
            <h2 id="find-trainers-title">Find trainers</h2>
            <p>Search by username to send a friend request.</p>
          </div>
        </div>

        <form className="friends-search-form" onSubmit={handleSearch}>
          <label className="ui-field ui-search-field">
            <span className="ui-field-label">Trainer username</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username..."
              className="search-input"
            />
          </label>
          <button type="submit" className="ui-btn primary" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search trainers'}
          </button>
        </form>

        {searchError && <p className="friends-search-error">{searchError}</p>}

        {searchResults.length > 0 && (
          <div className="friends-result-list">
            {searchResults.map((resUser) => {
              const rel = getRelationship(resUser.user_id);
              return (
                <div key={resUser.user_id} className="friends-result-row">
                  <div className="friends-person">
                    <span className="friends-avatar">{resUser.username.charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>@{resUser.username}</strong>
                      <span>Trainer</span>
                    </div>
                  </div>

                  <div className="friends-row-actions">
                    {rel.type === 'none' && (
                      <button type="button" className="ui-btn primary is-small" onClick={() => sendFriendRequest(resUser)}>
                        Add friend
                      </button>
                    )}
                    {rel.type === 'pending_sent' && <span className="ui-badge">Request sent</span>}
                    {rel.type === 'pending_received' && <span className="ui-badge is-blue">Pending request</span>}
                    {rel.type === 'accepted' && <span className="ui-badge is-success">Friends</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="ui-panel friends-requests-panel" aria-labelledby="friend-requests-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Inbox</span>
            <h2 id="friend-requests-title">Pending requests</h2>
          </div>
          <span className="ui-badge">{pendingRequests.length} waiting</span>
        </div>

        {loadingLists ? (
          <div className="ui-state is-compact" role="status">
            <span className="ui-spinner" aria-hidden="true" />
            <p>Loading requests...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="ui-state is-compact">
            <UsersFriendsIcon size={30} />
            <h3>No incoming requests</h3>
            <p>When someone adds you, their request appears here.</p>
          </div>
        ) : (
          <div className="friends-result-list">
            {pendingRequests.map((req) => (
              <div key={req.friendshipId} className="friends-result-row">
                <div className="friends-person">
                  <span className="friends-avatar is-pending">{req.username.charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>@{req.username}</strong>
                    <span>Wants to be friends</span>
                  </div>
                </div>
                <div className="friends-row-actions">
                  <button type="button" className="ui-btn primary is-small" onClick={() => acceptRequest(req.friendshipId, req.username)}>
                    Accept
                  </button>
                  <button type="button" className="ui-btn is-small" onClick={() => declineRequest(req.friendshipId)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ui-panel friends-list-panel" aria-labelledby="friends-list-title">
        <div className="ui-section-head">
          <div>
            <span className="home-eyebrow">Roster</span>
            <h2 id="friends-list-title">Your friends</h2>
          </div>
          <span className="ui-badge is-success">{onlineCount} online</span>
        </div>

        {loadingLists ? (
          <div className="ui-state is-compact" role="status">
            <span className="ui-spinner" aria-hidden="true" />
            <p>Loading friends...</p>
          </div>
        ) : friendsList.length === 0 ? (
          <div className="ui-state is-compact">
            <UsersFriendsIcon size={30} />
            <h3>No friends added yet</h3>
            <p>Use the search above to find trainers and send your first request.</p>
          </div>
        ) : (
          <div className="friends-grid">
            {friendsList.map((friend) => {
              const isOnline = Boolean(onlineUserIds && onlineUserIds[friend.userId]);
              return (
                <article key={friend.friendshipId} className="friends-card">
                  <div className="friends-person">
                    <span className={`friends-avatar ${isOnline ? 'is-online' : ''}`}>
                      {friend.username.charAt(0).toUpperCase()}
                      <span className={`friends-presence ${isOnline ? 'is-online' : ''}`} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>@{friend.username}</strong>
                      <span className={isOnline ? 'is-online-text' : ''}>{isOnline ? 'Online now' : 'Offline'}</span>
                    </div>
                  </div>

                  <div className="friends-card-actions">
                    <button
                      type="button"
                      className="ui-btn danger is-small"
                      onClick={() => handleChallengeFriend(friend)}
                      disabled={challengingId === friend.friendshipId}
                    >
                      <SwordsIcon size={16} />
                      {challengingId === friend.friendshipId ? 'Starting...' : 'Challenge'}
                    </button>
                    <button
                      type="button"
                      className="ui-btn ghost is-small"
                      onClick={() => removeFriend(friend.friendshipId, friend.username)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isConfigured && (
          <p className="friends-preview-note">
            <SparkleStarIcon size={16} /> Preview mode: friend requests and online status use local sample data.
          </p>
        )}
      </section>
    </div>
  );
}

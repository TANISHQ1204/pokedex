import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../store/supabaseClient';

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  loadingProfile: false,
  signInWithGoogle: async () => {},
  signInWithMagicLink: async () => {},
  signOut: async () => {},
  createProfile: async () => {},
  refetchProfile: async () => {},
  isConfigured: false,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const configured = isSupabaseConfigured();

  const fetchProfile = async (userId) => {
    if (!configured || !userId) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }
      setProfile(data || null);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setLoadingProfile(false);
      return;
    }

    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!isMounted) return;
      setSession(initSession);
      const currentUser = initSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoadingProfile(false);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoadingProfile(false);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [configured]);

  const signInWithGoogle = async () => {
    if (!configured) {
      throw new Error('Supabase environment variables are missing in .env');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });
    if (error) throw error;
  };

  const signInWithMagicLink = async (email) => {
    if (!configured) {
      throw new Error('Supabase environment variables are missing in .env');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!configured) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
    setProfile(null);
  };

  const createProfile = async (rawUsername) => {
    const trimmed = rawUsername ? rawUsername.trim() : '';

    // Validate 3-20 chars, alphanumeric + underscore, no spaces
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(trimmed)) {
      throw new Error('Username must be 3-20 characters long and contain only letters, numbers, or underscores (no spaces).');
    }

    if (!configured) {
      const mockProfile = { user_id: user?.id || 'guest', username: trimmed, created_at: new Date().toISOString() };
      setProfile(mockProfile);
      return mockProfile;
    }

    if (!user) {
      throw new Error('You must be logged in to set a username.');
    }

    // Check availability in database
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', trimmed)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('Uniqueness check error:', checkError.message);
    }

    if (existing) {
      throw new Error('Username is already taken. Please choose another.');
    }

    // Insert new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ user_id: user.id, username: trimmed }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Username is already taken. Please choose another.');
      }
      throw new Error(error.message || 'Failed to save username.');
    }

    setProfile(data);
    return data;
  };

  const refetchProfile = () => {
    if (user?.id) {
      return fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        loadingProfile,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
        createProfile,
        refetchProfile,
        isConfigured: configured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


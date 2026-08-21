import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../store/supabaseClient';

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithMagicLink: async () => {},
  signOut: async () => {},
  isConfigured: false,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
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

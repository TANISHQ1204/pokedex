import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signInWithMagicLink, signInWithGoogle, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMagicLinkSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setError(null);
      setLoading(true);
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#f8fafc' }}>PokéDex Battle</h1>
        <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '2rem' }}>Sign in to start collecting cards and battle trainers</p>

        {!isConfigured && (
          <div style={{ background: '#451a03', border: '1px solid #b45309', color: '#fef3c7', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.9rem' }}>
            <strong>Configuration Needed:</strong>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Please set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #b91c1c', color: '#fecaca', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {magicLinkSent ? (
          <div style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '1.25rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Check your email!</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              We sent a magic login link to <strong>{email}</strong>. Click the link in your email to sign in.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              style={{
                marginTop: '1rem',
                background: 'transparent',
                border: '1px solid #059669',
                color: '#a7f3d0',
                padding: '0.4rem 0.8rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !isConfigured}
                style={{
                  padding: '0.875rem 1rem',
                  fontSize: '0.95rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading || !isConfigured || !email}
                style={{
                  padding: '0.875rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading || !isConfigured || !email ? 'not-allowed' : 'pointer',
                  opacity: loading || !isConfigured || !email ? 0.7 : 1,
                  transition: 'background-color 0.2s',
                }}
              >
                {loading ? 'Sending link...' : 'Send magic link'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0', color: '#64748b' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
              <span style={{ fontSize: '0.85rem' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading || !isConfigured}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.875rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading || !isConfigured ? 'not-allowed' : 'pointer',
                opacity: loading || !isConfigured ? 0.7 : 1,
                transition: 'background-color 0.2s',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign in with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

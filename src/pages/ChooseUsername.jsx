import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PokeballIcon } from '../components/icons/GameIcons';

export default function ChooseUsername() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createProfile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const validateLocal = (val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Username cannot be empty.';
    }
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    if (trimmed.length > 20) {
      return 'Username cannot exceed 20 characters.';
    }
    if (/\s/.test(trimmed)) {
      return 'Username cannot contain spaces.';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, and underscores.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationMsg = validateLocal(username);
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setIsSubmitting(true);
    try {
      await createProfile(username);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to set username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metadata = user?.user_metadata || {};
  const fullName = metadata.full_name || metadata.name || user?.email || 'Trainer';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        backgroundColor: '#0b0f19',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
          border: '1px solid #334155',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
            <PokeballIcon size={36} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Welcome, {fullName}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            Choose a unique username to represent your Trainer Profile in the PokéDex League.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#450a0a',
              border: '1px solid #b91c1c',
              borderRadius: '0.5rem',
              color: '#fca5a5',
              fontSize: '0.9rem',
              lineHeight: 1.4,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#cbd5e1',
              }}
            >
              Choose Username
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                @
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="ash_ketchum"
                maxLength={20}
                autoFocus
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.875rem 0.75rem 2.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
              Must be 3-20 characters long. Letters, numbers, and underscores only.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            style={{
              width: '100%',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: isSubmitting || !username.trim() ? '#475569' : '#0284c7',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: isSubmitting || !username.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {isSubmitting ? 'Checking & Saving...' : 'Set Username'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
          <button
            onClick={() => signOut()}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

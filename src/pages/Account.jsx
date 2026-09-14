import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetNormalCollection } from '../store/collection';

const CONFIRM_TEXT = 'RESET MY COLLECTION';

export default function Account() {
  const { user, profile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const fullName = metadata.full_name || metadata.name || 'Trainer';
  const email = user?.email || 'No email provided';
  const username = profile?.username ? `@${profile.username}` : 'Not set';

  const openConfirm = () => {
    setConfirmInput('');
    setFeedback(null);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (isResetting) return;
    setConfirmOpen(false);
    setConfirmInput('');
  };

  const handleReset = async () => {
    if (confirmInput !== CONFIRM_TEXT || !user?.id) return;
    setIsResetting(true);
    setFeedback(null);
    try {
      const result = await resetNormalCollection(user.id);
      setFeedback({
        type: 'success',
        text: `Collection reset complete. ${result.deletedCount} card(s) cleared. Your Power/Ancient cards, friends, battles, and stats were not touched.`,
      });
      setConfirmOpen(false);
      setConfirmInput('');
    } catch (err) {
      console.error('Reset collection error:', err);
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to reset collection. Please try again.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const inputMatches = confirmInput === CONFIRM_TEXT;

  return (
    <div className="page-container">
      <h1 style={{ color: '#f8fafc', marginBottom: '1.5rem' }}>Account Profile</h1>

      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid #38bdf8',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc' }}>{fullName}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1.1rem' }}>{username}</span>
              {profile?.username && (
                <span
                  title="Usernames cannot be changed"
                  style={{
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    borderRadius: '0.25rem',
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                  }}
                >
                  Permanent
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>{email}</p>
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.25rem',
                backgroundColor: '#0284c7',
                color: '#e0f2fe',
              }}
            >
              Google Account
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #334155', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#fef2f2',
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="card"
        style={{
          maxWidth: '600px',
          marginTop: '1.5rem',
          border: '1px solid rgba(220, 38, 38, 0.45)',
          background: 'linear-gradient(180deg, rgba(127, 29, 29, 0.14), rgba(15, 23, 42, 0.6))',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: '0 0 0.25rem 0', color: '#fca5a5', fontSize: '1.05rem' }}>Danger Zone</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
            Reset your normal card collection back to zero. Power Cards, Ancient Cards, friends, battle stats, and your
            username are NOT affected.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
            ⚠️ Irreversible — all star levels &amp; dupes for normal cards will be lost.
          </span>
          <button
            onClick={openConfirm}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#fef2f2',
              backgroundColor: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Reset Collection
          </button>
        </div>

        {feedback && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              backgroundColor: feedback.type === 'success' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
              color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
              border: `1px solid ${feedback.type === 'success' ? '#16a34a' : '#dc2626'}`,
            }}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', border: '1px solid rgba(220, 38, 38, 0.5)' }}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ color: '#fca5a5' }}>Reset Collection?</h2>
              </div>
              <button className="modal-close-btn" onClick={closeConfirm} disabled={isResetting}>
                &times;
              </button>
            </div>

            <div style={{ color: '#f8fafc', fontSize: '0.95rem', lineHeight: 1.6, marginTop: '0.75rem' }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                This will <strong style={{ color: '#f87171' }}>permanently reset your entire card collection</strong>. All star
                levels and duplicate counts for your normal cards will return to zero, and owned shiny unlocks will be lost.
              </p>
              <p style={{ margin: '0 0 0.75rem 0' }}>This cannot be undone.</p>
              <p style={{ margin: '0 0 0.75rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                Not affected: Power Cards, Ancient Cards, friends, friendships, battle history/stats, and your username.
              </p>
              <p style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '0.9rem' }}>
                Type <strong style={{ color: '#fca5a5' }}>{CONFIRM_TEXT}</strong> to confirm:
              </p>
              <input
                type="text"
                value={confirmInput}
                disabled={isResetting}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={CONFIRM_TEXT}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.625rem 0.75rem',
                  fontSize: '0.9rem',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '0.375rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={closeConfirm}
                disabled={isResetting}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  backgroundColor: '#334155',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={!inputMatches || isResetting}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#fef2f2',
                  backgroundColor: inputMatches && !isResetting ? '#dc2626' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: inputMatches && !isResetting ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                }}
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>

            {!isConfigured && (
              <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Preview mode: resets the local mock collection store only. No database changes.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const fullName = metadata.full_name || metadata.name || 'Trainer';
  const email = user?.email || 'No email provided';

  return (
    <div className="page-container">
      <h1 style={{ color: '#f8fafc', marginBottom: '1.5rem' }}>Account Profile</h1>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
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
    </div>
  );
}

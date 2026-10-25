import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PokeballIcon,
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
  GymBadgeIcon,
  UsersFriendsIcon,
  ChartBarIcon,
  GamepadIcon,
} from './icons/GameIcons';

export default function Navbar() {
  const { user, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef(null);
  const location = useLocation();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Trainer Account';
  const displayName = profile?.username ? `@${profile.username}` : fullName;
  const moreActive = location.pathname === '/game-modes' || location.pathname === '/friends';

  const closeMenu = () => {
    setMenuOpen(false);
    if (moreRef.current) moreRef.current.open = false;
  };

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <header className={`nav-bar app-nav ${menuOpen ? 'is-open' : ''}`}>
      <div className="nav-bar-top">
        <NavLink to="/home" className="app-brand" onClick={closeMenu}>
          <span className="app-brand-mark">
            <PokeballIcon size={28} />
          </span>
          <span className="app-brand-copy">
            <span className="brand-text">PokéDex</span>
            <span className="brand-sub">Arcade League</span>
          </span>
        </NavLink>

        <div className="nav-top-actions">
          <NavLink to="/arcade" className="nav-play-cta" onClick={closeMenu}>
            <GamepadIcon size={18} />
            <span>Play Arcade</span>
          </NavLink>
          <button
            type="button"
            className={`nav-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav
        id="primary-navigation"
        className={`nav-links ${menuOpen ? 'nav-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="nav-primary">
          <NavLink to="/home" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <PokeballIcon size={18} /> Home
          </NavLink>
          <NavLink to="/arcade" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <GamepadIcon size={18} /> Arcade
          </NavLink>
          <NavLink to="/collection" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <CardsIcon size={18} /> Collection
          </NavLink>
          <NavLink to="/trophies" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <TrophyIcon size={18} tier="gold" /> Trophies
          </NavLink>
          <NavLink to="/badges" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <GymBadgeIcon size={18} color="#f59e0b" /> Badges
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <ChartBarIcon size={18} /> Stats
          </NavLink>
        </div>

        <div className="nav-secondary">
          <NavLink
            to="/battle"
            className={({ isActive }) => `nav-battle-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <SwordsIcon size={18} /> CPU Battle
          </NavLink>

          <details ref={moreRef} className={`nav-more ${moreActive ? 'is-active' : ''}`}>
            <summary className="nav-more-summary">
              More <span className="nav-more-chevron" aria-hidden="true" />
            </summary>
            <div className="nav-more-menu">
              <NavLink to="/game-modes" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                <CardsIcon size={18} /> Game Modes
              </NavLink>
              <NavLink to="/friends" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                <UsersFriendsIcon size={18} /> Friends
              </NavLink>
            </div>
          </details>

          <NavLink
            to="/account"
            className={({ isActive }) => (isActive ? 'active nav-user-link' : 'nav-user-link')}
            onClick={closeMenu}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="nav-avatar" />
            ) : (
              <span className="nav-avatar-fallback" aria-hidden="true">
                {trainerInitials(displayName)}
              </span>
            )}
            <span>{displayName}</span>
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

function trainerInitials(name) {
  const cleaned = String(name || 'Trainer').replace(/^@/, '').trim();
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]).join('') || 'TR').toUpperCase();
}

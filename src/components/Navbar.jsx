import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PokeballIcon,
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
  GymBadgeIcon,
  UsersFriendsIcon,
  ChartBarIcon,
} from './icons/GameIcons';

export default function Navbar() {
  const { user, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Trainer Account';
  const displayName = profile?.username ? `@${profile.username}` : fullName;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="nav-bar">
      <div className="nav-bar-top">
        <NavLink to="/home" style={{ textDecoration: 'none' }} onClick={closeMenu}>
          <div className="nav-brand">
            <PokeballIcon size={26} />
            <span className="brand-text">PokéDex League</span>
          </div>
        </NavLink>

        <button
          type="button"
          className={`nav-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
        <NavLink to="/home" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
          <PokeballIcon size={18} /> Home
        </NavLink>
        <NavLink to="/battle" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
          <SwordsIcon size={18} /> CPU Battle
        </NavLink>
        <NavLink to="/game-modes" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
          <CardsIcon size={18} /> Game Modes
        </NavLink>
        <NavLink to="/collection" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
          <PokeballIcon size={18} /> Collection
        </NavLink>
        <NavLink to="/friends" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
          <UsersFriendsIcon size={18} /> Friends
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

        <NavLink
          to="/account"
          className={({ isActive }) => (isActive ? 'active nav-user-link' : 'nav-user-link')}
          onClick={closeMenu}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="nav-avatar" />
          ) : (
            <span className="nav-avatar-fallback">👤</span>
          )}
          <span>{displayName}</span>
        </NavLink>
      </nav>
    </header>
  );
}
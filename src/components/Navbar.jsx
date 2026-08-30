import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PokeballIcon,
  SwordsIcon,
  CardsIcon,
  TrophyIcon,
  GymBadgeIcon,
  SparkleStarIcon,
  UsersFriendsIcon,
  ChartBarIcon,
} from './icons/GameIcons';

export default function Navbar() {
  const { user, profile } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Trainer Account';
  const displayName = profile?.username ? `@${profile.username}` : fullName;

  return (
    <header className="nav-bar">
      <NavLink to="/home" style={{ textDecoration: 'none' }}>
        <div className="nav-brand">
          <PokeballIcon size={26} />
          <span className="brand-text">PokéDex League</span>
        </div>
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/home" className={({ isActive }) => (isActive ? 'active' : '')}>
          <PokeballIcon size={18} /> Home
        </NavLink>
        <NavLink to="/battle" className={({ isActive }) => (isActive ? 'active' : '')}>
          <SwordsIcon size={18} /> CPU Battle
        </NavLink>
        <NavLink to="/game-modes" className={({ isActive }) => (isActive ? 'active' : '')}>
          <CardsIcon size={18} /> Game Modes
        </NavLink>
        <NavLink to="/collection" className={({ isActive }) => (isActive ? 'active' : '')}>
          <PokeballIcon size={18} /> Collection
        </NavLink>
        <NavLink to="/special-collection" className={({ isActive }) => (isActive ? 'active' : '')}>
          <SparkleStarIcon size={18} /> Special Collection
        </NavLink>
        <NavLink to="/friends" className={({ isActive }) => (isActive ? 'active' : '')}>
          <UsersFriendsIcon size={18} /> Friends
        </NavLink>
        <NavLink to="/trophies" className={({ isActive }) => (isActive ? 'active' : '')}>
          <TrophyIcon size={18} tier="gold" /> Trophies
        </NavLink>
        <NavLink to="/badges" className={({ isActive }) => (isActive ? 'active' : '')}>
          <GymBadgeIcon size={18} color="#f59e0b" /> Badges
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active' : '')}>
          <ChartBarIcon size={18} /> Stats
        </NavLink>

        <NavLink
          to="/account"
          className={({ isActive }) => (isActive ? 'active nav-user-link' : 'nav-user-link')}
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




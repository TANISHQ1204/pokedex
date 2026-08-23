import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import ChooseUsername from './pages/ChooseUsername';
import Home from './pages/Home';
import Battle from './pages/Battle';
import Collection from './pages/Collection';
import Trophies from './pages/Trophies';
import Badges from './pages/Badges';
import Account from './pages/Account';
import Friends from './pages/Friends';
import MatchLobby from './pages/MatchLobby';
import JoinMatch from './pages/JoinMatch';
import GameModes from './pages/GameModes';
import MatchInviteBanner from './components/MatchInviteBanner';

function ProtectedRoute({ children }) {
  const { session, profile, loading, loadingProfile, isConfigured } = useAuth();
  const location = useLocation();

  if (loading || (isConfigured && session && loadingProfile)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#94a3b8' }}>
        Loading session...
      </div>
    );
  }

  // If Supabase isn't configured yet, allow viewing routes for preview
  if (!isConfigured) {
    return (
      <>
        <Navbar />
        <main>{children}</main>
      </>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // User logged in but no profile row set yet
  if (!profile) {
    if (location.pathname !== '/choose-username') {
      return <Navigate to="/choose-username" replace />;
    }
    return <main>{children}</main>;
  }

  // User has profile already; don't allow visiting /choose-username
  if (location.pathname === '/choose-username') {
    return <Navigate to="/home" replace />;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function PublicRoute({ children }) {
  const { session, profile, loading, loadingProfile, isConfigured } = useAuth();

  if (loading || (isConfigured && session && loadingProfile)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#94a3b8' }}>
        Loading session...
      </div>
    );
  }

  if (isConfigured && session) {
    if (!profile) {
      return <Navigate to="/choose-username" replace />;
    }
    const redirectUrl = sessionStorage.getItem('post_login_redirect');
    if (redirectUrl) {
      sessionStorage.removeItem('post_login_redirect');
      return <Navigate to={redirectUrl} replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return <main>{children}</main>;
}

export default function App() {
  return (
    <AuthProvider>
      <MatchInviteBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/choose-username"
          element={
            <ProtectedRoute>
              <ChooseUsername />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/battle"
          element={
            <ProtectedRoute>
              <Battle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game-modes"
          element={
            <ProtectedRoute>
              <GameModes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collection"
          element={
            <ProtectedRoute>
              <Collection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trophies"
          element={
            <ProtectedRoute>
              <Trophies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/badges"
          element={
            <ProtectedRoute>
              <Badges />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/match/:matchId"
          element={
            <ProtectedRoute>
              <MatchLobby />
            </ProtectedRoute>
          }
        />
        <Route path="/join/:matchId" element={<JoinMatch />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}








import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import Battle from './pages/Battle';
import Collection from './pages/Collection';
import Trophies from './pages/Trophies';
import Badges from './pages/Badges';
import Account from './pages/Account';

function ProtectedRoute({ children }) {
  const { session, loading, isConfigured } = useAuth();

  if (loading) {
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

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function PublicRoute({ children }) {
  const { session, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#94a3b8' }}>
        Loading session...
      </div>
    );
  }

  if (isConfigured && session) {
    return <Navigate to="/home" replace />;
  }

  return <main>{children}</main>;
}

export default function App() {
  return (
    <AuthProvider>
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
          path="/collection"
          element={
            <ProtectedRoute>
              <Collection />
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
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}

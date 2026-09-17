import React, { Component, useEffect, useState } from 'react';
import {
  ROUNDS,
  BALLS_PER_SET,
  createSession,
  currentRound,
  pickBall,
  dealKeep,
  dealSwap,
  advanceRound,
  stepActor,
  THEME_CATEGORIES,
} from '../game/dealOrNoDeal';
import { baseStatTotal } from '../game/mysteryDraft';
import DraftSummary from '../components/DraftSummary';
import PokemonImage from '../components/PokemonImage';
import { PokeballIcon } from '../components/icons/GameIcons';

const MAX_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DEAL_STORAGE_KEY = 'pokedex_deal_or_no_deal_state';

function saveDealState(data) {
  try {
    localStorage.setItem(DEAL_STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* quota exceeded or private mode — ignore */ }
}

function loadDealState() {
  try {
    const raw = localStorage.getItem(DEAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearDealState() {
  try { localStorage.removeItem(DEAL_STORAGE_KEY); } catch (_) { /* ignore */ }
}

function categoryLabel(id) {
  const found = THEME_CATEGORIES.find((c) => c.id === id);
  return found ? found.label : 'Mystery';
}

class DealErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            borderRadius: '0.75rem',
            background: '#1e293b',
            border: '1px solid #ef4444',
            textAlign: 'center',
            maxWidth: 600,
            margin: '2rem auto',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ color: '#f8fafc', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
            The game encountered an unexpected error. Your session data may be lost.
          </p>
          <button
            onClick={() => {
              try { localStorage.removeItem(DEAL_STORAGE_KEY); } catch (_) {}
              window.location.reload();
            }}
            style={{
              padding: '0.7rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'linear-gradient(90deg, #0284c7, #0369a1)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SetupScreen({ initial, onStart }) {
  const [nameA, setNameA] = useState(initial?.nameA || '');
  const [nameB, setNameB] = useState(initial?.nameB || '');
  const [maxGen, setMaxGen] = useState(initial?.maxGen ?? 9);
  const [error, setError] = useState('');

  const handleStart = () => {
    const a = nameA.trim();
    const b = nameB.trim();
    if (!a || !b) {
      setError('Enter both player names.');
      return;
    }
    if (a.toLowerCase() === b.toLowerCase()) {
      setError('Player names must be different.');
      return;
    }
    setError('');
    onStart({ nameA: a, nameB: b, maxGen });
  };

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Local Party Game • No saves, no database
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>Deal or No Deal Setup</h2>
        <p style={{ margin: '0.4rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          The arbitrator runs this screen. 6 rounds × 6 closed Pokéballs, every set sharing one theme —
          a Generation, a Color, or Legendary/Mythical. Base species, alternate forms, legendaries &amp; mythicals all
          have an equal chance, and no Pokémon repeats across all 6 rounds. Players take turns claiming a mystery ball,
          then each gets ONE deal: keep what you opened, or swap it for a different closed ball (your first pick is burned).
          Round order flips each round (A,B,B,A then B,A,A,B). Build a 6-Pokémon team and win the draft-style summary!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Player 1 Name</span>
          <input
            value={nameA}
            onChange={(e) => setNameA(e.target.value)}
            placeholder="e.g. Ash"
            style={{
              background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
              padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.95rem',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Player 2 Name</span>
          <input
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
            placeholder="e.g. Brock"
            style={{
              background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
              padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.95rem',
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>
          Maximum Generation <span style={{ color: '#475569' }}>(no Pokémon from later generations appear in any round, whatever the theme — ~15% of balls are shiny)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {MAX_GENS.map((g) => (
            <button
              key={g}
              onClick={() => setMaxGen(g)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                border: maxGen === g ? '2px solid #38bdf8' : '1px solid #334155',
                background: maxGen === g ? '#0284c7' : '#1e293b',
                color: maxGen === g ? '#ffffff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              Gen {g}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleStart}
        style={{
          width: '100%',
          padding: '0.95rem',
          border: 'none',
          borderRadius: '0.6rem',
          background: 'linear-gradient(90deg, #16a34a, #15803d)',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '1.05rem',
          cursor: 'pointer',
          boxShadow: '0 6px 14px rgba(22, 163, 74, 0.35)',
        }}
      >
        💼 Open the Case — Start Game
      </button>
    </div>
  );
}

export default function DealOrNoDeal() {
  const [phase, setPhase] = useState('setup');
  const [lastSetup, setLastSetup] = useState(null);
  const [session, setSession] = useState(null);

  const handleStart = ({ nameA, nameB, maxGen }) => {
    setLastSetup({ nameA, nameB, maxGen });
    setSession(createSession({ playerNames: [nameA, nameB], maxGen }));
    setPhase('playing');
  };

  const handlePlayAgain = () => {
    clearDealState();
    setSession(null);
    setPhase('setup');
  };

  useEffect(() => {
    // Mirror the CPU battle / Mystery Draft refresh-safe persistence: a full
    // browser refresh always starts a fresh game; SPA navigation restores it.
    let pageWasReloaded = false;
    try {
      const nav = window.performance?.getEntriesByType?.('navigation')?.[0];
      pageWasReloaded = Boolean(nav && nav.type === 'reload');
    } catch (_) {
      /* navigation timing unavailable — ignore */
    }
    if (pageWasReloaded) {
      clearDealState();
    }

    const saved = loadDealState();
    if (saved && saved.session && saved.session.status && saved.session.status !== 'summary') {
      setPhase(saved.phase || 'playing');
      setLastSetup(saved.lastSetup || null);
      setSession(saved.session);
    } else {
      clearDealState();
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    if (phase === 'setup') return;
    if (session.status === 'summary') {
      clearDealState();
      return;
    }
    saveDealState({ phase, session, lastSetup });
  }, [phase, session, lastSetup]);

  const showSummary = phase === 'playing' && session && session.status === 'summary';
  const showPlaying = phase === 'playing' && session && session.status !== 'summary';

  if (phase === 'playing' && !session) {
    setPhase('setup');
    return null;
  }

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
          Deal or No Deal
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          Claim a mystery Pokéball, then decide — deal, or swap it for the unknown. Everything lives in this session only.
        </p>
      </div>

      <DealErrorBoundary key={showSummary ? 'summary' : 'playing'}>
        {phase === 'setup' && (
          <SetupScreen initial={lastSetup} onStart={handleStart} />
        )}

        {showPlaying && (
          <PlayingView session={session} setSession={setSession} onExit={handlePlayAgain} />
        )}

        {showSummary && (
          <DraftSummary
            players={session.players}
            title="🏁 All Deals Made"
            onPlayAgain={handlePlayAgain}
            playLabel="Play Again — New Deal"
            intro={
              <>
                {ROUNDS} rounds × {BALLS_PER_SET} themed mystery balls — 36 unique Pokémon, none repeated. Each Pokemon scores its BST modified by a
                transparent stack — <strong style={{ color: '#f87272' }}>×1.5</strong> Legendary/Mythical,{' '}
                <strong style={{ color: '#fbbf24' }}>×1.2</strong> shiny,{' '}
                <strong style={{ color: '#a78bfa' }}>×1.1</strong> alternate form — and the highest total team score wins.
              </>
            }
          />
        )}
      </DealErrorBoundary>

      {session && session.error && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.6rem 1rem',
            borderRadius: '0.5rem',
            background: '#450a0a',
            border: '1px solid #ef4444',
            color: '#fecaca',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          ⚠️ {session.error}
        </div>
      )}
    </div>
  );
}

function BallTile({ ball, index, clickable, onClick, size = 'md', ownerName, revealClosed = false }) {
  const dim = size === 'lg' ? 64 : 46;

  if (ball.state === 'closed' && !revealClosed) {
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onClick(index)}
        title="Closed mystery Pokéball"
        style={{
          position: 'relative',
          width: dim,
          height: dim,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: clickable ? '3px solid #22c55e' : '2px solid #334155',
          background: '#0f172a',
          boxShadow: clickable ? '0 0 14px rgba(34, 197, 94, 0.45)' : '0 4px 10px rgba(0,0,0,0.4)',
          cursor: clickable ? 'pointer' : 'default',
          padding: 0,
          transition: 'transform 0.12s ease',
        }}
      >
        <PokeballIcon size={size === 'lg' ? 40 : 30} />
        {clickable && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 4,
              fontSize: '0.55rem',
              fontWeight: 900,
              color: '#22c55e',
              letterSpacing: '0.05em',
              textAlign: 'center',
            }}
          >
            OPEN
          </span>
        )}
      </button>
    );
  }

  // Revealed-but-unclaimed ball (round complete) — shows what was left behind.
  if (ball.state === 'closed' && revealClosed) {
    return (
      <div
        title={`#${String(ball.entry.dexNo || ball.entry.id).padStart(3, '0')} ${ball.entry.display || ball.entry.name} · BST ${ball.entry.bst ?? baseStatTotal(ball.entry)}${ball.entry.variant === 'shiny' ? ' · SHINY' : ''} — left on the shelf`}
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: ball.entry.variant === 'shiny' ? '2px dashed #fbbf24' : '2px dashed #475569',
          background: 'rgba(15, 23, 42, 0.6)',
          opacity: 0.8,
        }}
      >
        <PokemonImage pokemon={ball.entry} alt={ball.entry.name} style={{ width: dim - 12, height: dim - 12, objectFit: 'contain', opacity: 0.7 }} />
      </div>
    );
  }
  if (ball.state === 'burned') {
    return (
      <div
        title="Burned — no longer available"
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #1e293b',
          background: 'rgba(15, 23, 42, 0.4)',
          color: '#475569',
          fontSize: size === 'lg' ? '1.2rem' : '0.9rem',
          opacity: 0.55,
        }}
      >
        ✕
      </div>
    );
  }
  // pending or won — revealed sprite
  const shiny = ball.entry.variant === 'shiny';
  return (
    <div
      title={`#${String(ball.entry.dexNo || ball.entry.id).padStart(3, '0')} ${ball.entry.display || ball.entry.name} · BST ${ball.entry.bst ?? baseStatTotal(ball.entry)}${shiny ? ' · SHINY' : ''}${ownerName ? ` · ${ownerName}` : ''}`}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: shiny ? '2px solid #fbbf24' : ball.state === 'won' ? '2px solid #16a34a' : '2px solid #38bdf8',
        background: '#0f172a',
        boxShadow: shiny ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
      }}
    >
      <PokemonImage pokemon={ball.entry} alt={ball.entry.name} style={{ width: dim - 12, height: dim - 12, objectFit: 'contain' }} />
    </div>
  );
}

function BallInfoChip({ ball }) {
  const name = ball.entry.display || ball.entry.name;
  return (
    <span
      title={`#${String(ball.entry.dexNo || ball.entry.id).padStart(3, '0')} ${name}${ball.entry.variant === 'shiny' ? ' · SHINY' : ''}`}
      style={{
        padding: '0.35rem 0.7rem',
        borderRadius: '2rem',
        background: 'rgba(15, 23, 42, 0.7)',
        border: ball.entry.variant === 'shiny' ? '1px dashed #fbbf24' : '1px dashed #475569',
        color: ball.entry.variant === 'shiny' ? '#fde68a' : '#cbd5e1',
        fontSize: '0.8rem',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      #{String(ball.entry.dexNo || ball.entry.id).padStart(3, '0')} {name}
      {ball.entry.variant === 'shiny' && ' ✨'}
      {ball.entry.rarer && ' ⭐'}
    </span>
  );
}

function UnchosenList({ balls }) {
  const leftover = balls.filter((b) => b.state === 'closed');
  const burned = balls.filter((b) => b.state === 'burned');
  if (leftover.length === 0 && burned.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {leftover.length > 0 && (
        <div style={{ marginBottom: '0.4rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            Not chosen this round — left on the shelf:
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {leftover.map((b, i) => <BallInfoChip key={`shelf-${b.entry.id}-${i}`} ball={b} />)}
          </div>
        </div>
      )}
      {burned.length > 0 && (
        <div style={{ marginBottom: '0.4rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            Burned in swaps:
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', opacity: 0.75 }}>
            {burned.map((b, i) => <BallInfoChip key={`burned-${b.entry.id}-${i}`} ball={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerDraftPanel({ player, session, active }) {
  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        flex: 1,
        minWidth: 'min(240px, 100%)',
        border: active ? '2px solid #38bdf8' : '1px solid #334155',
        boxShadow: active ? '0 0 18px rgba(56, 189, 248, 0.25)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1rem', color: '#f8fafc' }}>
          {player.name} {active && <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>🎯 your turn</span>}
        </span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
          burned {player.burned}
        </span>
      </div>
      {player.lastAction && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>
          {player.lastAction}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>
        TEAM ({player.won.length}/{ROUNDS})
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', minHeight: 34 }}>
        {player.won.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>No Pokemon locked yet</span>
        )}
        {player.won.map((entry, i) => (
          <span
            key={`${entry.id}-${i}`}
            title={`#${String(entry.dexNo || entry.id).padStart(3, '0')} ${entry.display || entry.name} · BST ${entry.bst ?? baseStatTotal(entry)}`}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#0f172a',
              border: entry.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <PokemonImage pokemon={entry} alt={entry.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </span>
        ))}
      </div>
    </div>
  );
}

function PlayingView({ session, setSession, onExit }) {
  const [swapMode, setSwapMode] = useState(false);
  const isRoundComplete = session.status === 'round_complete';
  const actorId = stepActor(session);
  const actor = actorId != null ? session.players[actorId] : null;
  const pickPhase = session.stepPos < 2 && !isRoundComplete;
  const round = currentRound(session);
  const playerMap = { [session.players[0].id]: session.players[0].name, [session.players[1].id]: session.players[1].name };

  useEffect(() => {
    setSwapMode(false);
  }, [session.stepPos, session.round]);

  const handlePick = (i) => setSession(pickBall(session, i));
  const handleKeep = () => setSession(dealKeep(session));
  const handleSwap = (i) => {
    setSession(dealSwap(session, i));
    setSwapMode(false);
  };
  const handleAdvanceRound = () => setSession(advanceRound(session));

  const handleBallClick = (i) => {
    if (pickPhase) {
      handlePick(i);
    } else if (swapMode) {
      handleSwap(i);
    }
  };

  const clickableBall = (i) => {
    if (pickPhase) return session.balls[i].state === 'closed';
    return swapMode && actor != null && session.balls[i].state === 'closed';
  };

  const actorPending = actor && actor.pendingBall != null ? session.balls[actor.pendingBall] : null;

  return (
    <>
      {/* Progress header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: 0, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc' }}>
          Round <span style={{ color: '#22c55e' }}>{session.round}</span> / {ROUNDS}
          <span
            style={{
              marginLeft: '0.6rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#0f172a',
              background: '#4ade80',
              padding: '0.15rem 0.6rem',
              borderRadius: '2rem',
            }}
          >
            Theme: {session.themeLabel} — {categoryLabel(session.themeCategory)}
          </span>
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '0.15rem 0.55rem',
              borderRadius: '2rem',
            }}
          >
            Gen {session.maxGen ?? 9} pool
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {session.rounds.map((_, i) => {
            const isCurrent = i + 1 === session.round;
            const done = i + 1 < session.round;
            return (
              <span
                key={i}
                title={done ? `Round ${i + 1} complete` : isCurrent ? `Round ${i + 1} in progress` : `Round ${i + 1} upcoming`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: done ? '#166534' : isCurrent ? '#16a34a' : '#1e293b',
                  border: isCurrent ? '2px solid #4ade80' : '1px solid #475569',
                  boxShadow: isCurrent ? '0 0 10px rgba(34, 197, 94, 0.7)' : 'none',
                }}
              />
            );
          })}
        </div>
        <button
          onClick={onExit}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            color: '#94a3b8',
            padding: '0.45rem 0.9rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          ⏹ End Session
        </button>
      </div>

      {session.lastResult && (
        <div
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '0.5rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #16a34a',
            color: '#bbf7d0',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '0.75rem',
          }}
        >
          💼 {session.lastResult}
        </div>
      )}

      {/* Player panels */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {session.players.map((p) => (
          <PlayerDraftPanel key={p.id} player={p} session={session} active={actor != null && actor.id === p.id} />
        ))}
      </div>

      {/* Ball board */}
      <div className="card" style={{ marginTop: 0, border: pickPhase ? '2px solid #22c55e' : swapMode ? '2px solid #f59e0b' : '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isRoundComplete ? '#4ade80' : pickPhase ? '#4ade80' : swapMode ? '#fbbf24' : '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isRoundComplete ? `✅ Round ${session.round} complete — ${BALLS_PER_SET} balls resolved` : pickPhase ? `🔒 Mystery Pokéballs — all ${BALLS_PER_SET} share the theme` : swapMode ? '🔀 No Deal — pick a closed ball to swap into' : 'Revealed — decide your deal'}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
            {pickPhase && actor ? `${actor.name} picks first this round` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {session.balls.map((ball, i) => (
            <BallTile
              key={i}
              ball={ball}
              index={i}
              clickable={clickableBall(i)}
              onClick={handleBallClick}
              ownerName={ball.ownerId != null ? playerMap[ball.ownerId] : undefined}
              revealClosed={isRoundComplete}
            />
          ))}
        </div>

        {!pickPhase && !isRoundComplete && actor && actorPending && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: '0.6rem',
              background: 'rgba(30, 41, 59, 0.6)',
              border: swapMode ? '1px dashed #f59e0b' : '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {actor.name} opened a mystery ball — Deal or No Deal?
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
              <BallTile ball={actorPending} index={actor.pendingBall} clickable={false} onClick={() => {}} size="lg" />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc' }}>
                  #{String(actorPending.entry.dexNo || actorPending.entry.id).padStart(3, '0')} {actorPending.entry.display || actorPending.entry.name}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                  BST {actorPending.entry.bst ?? baseStatTotal(actorPending.entry)}
                  {actorPending.entry.rarer && ' · ⭐ Legendary/Mythical'}
                  {actorPending.entry.variant === 'shiny' && ' · ✨ Shiny'}
                </div>
              </div>
              {swapMode ? (
                <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem' }}>
                  Tap a closed ball to swap — what you give up is burned forever!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleKeep}
                    style={{
                      padding: '0.7rem 1.25rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Deal — keep it
                  </button>
                  <button
                    onClick={() => setSwapMode(true)}
                    style={{
                      padding: '0.7rem 1.25rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #f59e0b',
                      background: 'transparent',
                      color: '#fbbf24',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    🔀 No Deal — swap
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isRoundComplete && (
          <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', borderRadius: '0.6rem', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid #16a34a' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4ade80', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Round {session.round} Complete — Review the board
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {session.players.map((p) => (
                <div key={p.id} style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
                    {p.name}'s pick this round:
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 800 }}>
                    {p.lastAction || '—'}
                  </div>
                </div>
              ))}
            </div>
            <UnchosenList balls={session.balls} />
            <button
              onClick={handleAdvanceRound}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: session.round >= ROUNDS ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              {session.round >= ROUNDS ? '🏁 See Results' : `Next Round → (Round ${session.round + 1} / ${ROUNDS})`}
            </button>
          </div>
        )}

        {!pickPhase && !isRoundComplete && round && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
            Round theme: every ball here is a {session.themeLabel} — {categoryLabel(session.themeCategory)}
          </div>
        )}
      </div>
    </>
  );
}
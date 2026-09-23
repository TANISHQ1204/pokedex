import React, { Component, useEffect, useMemo, useState } from 'react';
import { createSession, lockGuess, advanceRound, nameOptions, TEAM_SIZE } from '../game/dexBattle';
import { baseStatTotal, ALL_GENS } from '../game/mysteryDraft';
import DraftSummary from '../components/DraftSummary';
import PokemonImage from '../components/PokemonImage';

const DEXBATTLE_STORAGE_KEY = 'pokedex_dex_battle_state';

function saveDealState(data) {
  try {
    localStorage.setItem(DEXBATTLE_STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* quota exceeded or private mode — ignore */ }
}

function loadDealState() {
  try {
    const raw = localStorage.getItem(DEXBATTLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearDealState() {
  try { localStorage.removeItem(DEXBATTLE_STORAGE_KEY); } catch (_) { /* ignore */ }
}

class DexErrorBoundary extends Component {
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
            Dex Battle hit an unexpected error. Your session data may be lost.
          </p>
          <button
            onClick={() => {
              try { localStorage.removeItem(DEXBATTLE_STORAGE_KEY); } catch (_) {}
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
  const [selectedGens, setSelectedGens] = useState(initial?.gens?.length ? [...initial.gens].sort((a, b) => a - b) : [...ALL_GENS]);
  const [error, setError] = useState('');

  const isAllGens = selectedGens.length === ALL_GENS.length;

  const toggleGen = (g) => {
    setSelectedGens((prev) => {
      const next = prev.includes(g)
        ? prev.filter((x) => x !== g)
        : [...prev, g].sort((a, b) => a - b);
      return next.length === 0 ? [...ALL_GENS] : next;
    });
  };

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
    onStart({ nameA: a, nameB: b, gens: selectedGens });
  };

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f97316', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Local Party Game • No saves, no database
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>Dex Battle Setup</h2>
        <p style={{ margin: '0.4rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          The arbitrator runs this screen. A random Pokémon is chosen and only its <strong style={{ color: '#fdba74' }}>dex number</strong> is revealed.
          Both players race — no turns — to type a Pokémon name from memory. Once both guesses are locked in, the player whose
          guess is <strong style={{ color: '#fdba74' }}>closest by dex</strong> wins that Pokémon (base form, alternate form or shiny — rolled at award time).
          Equal-distance rounds are <strong style={{ color: '#fca5a5' }}>voided</strong> and replaced by a new Pokémon.
          First to {TEAM_SIZE} wins; the remaining Pokémon go to the other player to complete a {TEAM_SIZE}-Pokémon team.
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
          Generations to Include <span style={{ color: '#475569' }}>(toggle each; only Pokemon from the selected generations can be shown, guessed or won)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedGens([...ALL_GENS])}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              border: isAllGens ? '2px solid #fb923c' : '1px solid #334155',
              background: isAllGens ? '#ea580c' : '#1e293b',
              color: isAllGens ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            All
          </button>
          {ALL_GENS.map((g) => {
            const on = selectedGens.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGen(g)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  border: on ? '2px solid #fb923c' : '1px solid #334155',
                  background: on ? '#ea580c' : '#1e293b',
                  color: on ? '#ffffff' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                Gen {g}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '0.4rem' }}>
          {isAllGens
            ? 'Every generation included (Gen 1–9).'
            : `Selected: Generation${selectedGens.length > 1 ? 's' : ''} ${selectedGens.join(', ')}.`}
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
          background: 'linear-gradient(90deg, #ea580c, #c2410c)',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '1.05rem',
          cursor: 'pointer',
          boxShadow: '0 6px 14px rgba(234, 88, 12, 0.35)',
        }}
      >
        🎲 Start Dex Battle
      </button>
    </div>
  );
}

export default function DexBattle() {
  const [phase, setPhase] = useState('setup');
  const [lastSetup, setLastSetup] = useState(null);
  const [session, setSession] = useState(null);

  const handleStart = ({ nameA, nameB, gens }) => {
    setLastSetup({ nameA, nameB, gens });
    setSession(createSession({ playerNames: [nameA, nameB], gens }));
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
    if (saved && saved.session && saved.session.phase && saved.session.phase !== 'summary') {
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
    if (session.phase === 'summary') {
      clearDealState();
      return;
    }
    saveDealState({ phase, session, lastSetup });
  }, [phase, session, lastSetup]);

  const showSummary = phase === 'playing' && session && session.phase === 'summary';
  const showPlaying = phase === 'playing' && session && session.phase !== 'summary';

  if (phase === 'playing' && !session) {
    setPhase('setup');
    return null;
  }

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
          Dex Battle
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          One dex number, two speedy brains. Guess the name closest to the secret Pokémon. Everything lives in this session only.
        </p>
      </div>

      <DexErrorBoundary key={showSummary ? 'summary' : 'playing'}>
        {phase === 'setup' && (
          <SetupScreen initial={lastSetup} onStart={handleStart} />
        )}

        {showPlaying && (
          <PlayingView session={session} setSession={setSession} onExit={handlePlayAgain} />
        )}

        {showSummary && (
          <DraftSummary
            players={session.players}
            title="🏁 Dex Battle Complete"
            onPlayAgain={handlePlayAgain}
            playLabel="Play Again — New Dex Battle"
            intro={
              <>
                {session.players.length > 0 && (
                  <span>
                    {session.round} round{Math.max(1, session.round) === 1 ? '' : 's'}{' '}
                    {session.voidedRounds > 0 && (
                      <span style={{ color: '#fca5a5' }}> ({session.voidedRounds} tied round{session.voidedRounds === 1 ? '' : 's'} voided)</span>
                    )} — the first to {TEAM_SIZE} won and the rest of the bench went to the other player.
                  </span>
                )}{' '}
                Each Pokemon scores its BST modified by a transparent stack —{' '}
                <strong style={{ color: '#f87272' }}>×1.5</strong> Legendary/Mythical,{' '}
                <strong style={{ color: '#fbbf24' }}>×1.2</strong> shiny,{' '}
                <strong style={{ color: '#a78bfa' }}>×1.1</strong> alternate form — and the highest total team score wins.
                {session.gens && session.gens.length < ALL_GENS.length && (
                  <span style={{ color: '#38bdf8' }}> Pool was limited to Generations {session.gens.join(', ')}.</span>
                )}
              </>
            }
          />
        )}
      </DexErrorBoundary>

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

function GuessBox({ player, session, accent, onLock }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  const locked = !!session.guesses[player.id];
  const canType = session.phase === 'guess' && !locked;
  const suggestions = useMemo(() => (canType ? nameOptions(session.gens, text) : []), [session.gens, text, canType]);

  useEffect(() => {
    setHi(0);
  }, [text]);

  useEffect(() => {
    if (!canType) setOpen(false);
  }, [canType]);

  const selectOption = (label) => {
    setText(label);
    setOpen(false);
    setHi(0);
  };

  const handleKey = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = suggestions[hi];
      if (s) selectOption(s.label);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const boxedGuess = session.guesses[player.id];

  return (
    <div style={{ background: '#0f172a', borderRadius: '0.6rem', padding: '0.6rem', border: `1px solid ${accent}` }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: accent, letterSpacing: '0.04em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
        {player.name}'s Guess
      </div>

      {locked ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            background: 'rgba(15, 23, 42, 0.7)',
            border: `1px dashed ${accent}`,
            color: '#94a3b8',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          🔒 Guess locked
          {session.phase === 'resolved' && boxedGuess && (
            <span style={{ color: '#f8fafc', fontWeight: 900 }}>
              → #{String(boxedGuess.dexNo).padStart(3, '0')} {boxedGuess.name}
            </span>
          )}
        </div>
      ) : session.phase === 'resolved' ? (
        <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '0.5rem 0.25rem', fontWeight: 700 }}>
          Round resolved — next round decides the winner.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={handleKey}
              placeholder="Type a Pokemon name…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 0,
                background: '#0b1220',
                border: '1px solid #334155',
                color: '#f8fafc',
                padding: '0.55rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.92rem',
              }}
            />
            <button
              onClick={() => onLock(text)}
              disabled={!text.trim()}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: text.trim() ? accent : '#334155',
                color: text.trim() ? '#ffffff' : '#64748b',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              🔒 Lock
            </button>
          </div>

          {open && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 20,
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)',
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={`${s.dexNo}-${s.label}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(s.label)}
                  onMouseEnter={() => setHi(i)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.8rem',
                    border: 'none',
                    background: i === hi ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    color: '#f8fafc',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                    #{String(s.dexNo).padStart(3, '0')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerDraftPanel({ player, session, accent, onLock }) {
  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        flex: 1,
        minWidth: 'min(260px, 100%)',
        border: `1px solid ${accent}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#f8fafc' }}>{player.name}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: accent }}>
          {player.won.length}/{TEAM_SIZE} won
        </span>
      </div>

      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>
        TEAM
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', minHeight: 34 }}>
        {player.won.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>No Pokemon won yet</span>
        )}
        {player.won.map((entry, i) => (
          <span
            key={`${entry.id}-${i}`}
            title={`#${String(entry.dexNo || entry.id).padStart(3, '0')} ${entry.display || entry.name} · BST ${entry.bst ?? baseStatTotal(entry)}${entry.variant === 'shiny' ? ' · SHINY' : ''}`}
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

      <div style={{ marginTop: '0.6rem' }}>
        <GuessBox player={player} session={session} accent={accent} onLock={onLock} />
      </div>
    </div>
  );
}

function ResolutionPanel({ session, onNext }) {
  const r = session.resolved;
  if (!r) return null;
  const guesses = (r.guesses || []).filter(Boolean);

  return (
    <div className="card" style={{ marginTop: 0, border: r.voided ? '2px solid #f59e0b' : '2px solid #f97316' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: r.voided ? '#fbbf24' : '#fb923c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        {r.voided ? '🤝 Round Voided' : '🏆 Round Won'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '0.75rem',
            background: '#0f172a',
            border: r.awarded && r.awarded.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #475569',
            boxShadow: r.awarded && r.awarded.variant === 'shiny' ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {r.awarded ? (
            <PokemonImage pokemon={r.awarded} alt={r.awarded.name} style={{ width: 84, height: 84, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '2rem', opacity: 0.5 }}>❓</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>
            The secret Pokémon was
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#f8fafc' }}>{session.secretLabel}</div>
          {r.awarded && (
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, marginTop: '0.2rem' }}>
              Won by {session.players[r.winnerId].name}
              {r.awarded.formKind && <span style={{ color: '#a78bfa' }}> · {r.awarded.formLabel || 'Alternate Form'}</span>}
              {r.awarded.variant === 'shiny' && <span style={{ color: '#fbbf24' }}> · ★ SHINY</span>}
              <span style={{ color: '#64748b' }}> · BST {r.awarded.bst ?? baseStatTotal(r.awarded)}</span>
            </div>
          )}
          {r.voided && (
            <div style={{ fontSize: '0.85rem', color: '#fcd34d', fontWeight: 700, marginTop: '0.2rem' }}>
              Nobody wins — both players guessed equally far away. A new Pokémon is on the way.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        {guesses.map((g) => {
          const isWinner = !r.voided && g.playerId === r.winnerId;
          return (
            <div
              key={g.playerId}
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: '0.5rem',
                background: '#0f172a',
                border: isWinner ? '2px solid #f97316' : '1px solid #334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem' }}>{session.players[g.playerId].name}</span>
                <span style={{ color: isWinner ? '#fdba74' : '#e2e8f0', fontWeight: 900, fontSize: '0.82rem' }}>
                  #{String(g.dexNo).padStart(3, '0')} {g.name}
                </span>
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                distance {g.distance} {g.distance === 0 ? '· exact hit!' : isWinner ? '· closest' : ''}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNext}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: 'linear-gradient(90deg, #f97316, #ea580c)',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '0.95rem',
          cursor: 'pointer',
        }}
      >
        🔄 Next Round →
      </button>
    </div>
  );
}

function PlayingView({ session, setSession, onExit }) {
  const handleLock = (playerId, name) => setSession(lockGuess(session, playerId, name));
  const handleNext = () => setSession(advanceRound(session));
  const accents = ['#38bdf8', '#fb7185'];
  const lockedCount = session.guesses.filter(Boolean).length;

  return (
    <>
      {/* Progress header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: 0, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span>
            Round <span style={{ color: '#fb923c' }}>{session.round}</span>
          </span>
          <span
            style={{
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
            {session.gens && session.gens.length < ALL_GENS.length
              ? `Gens ${session.gens.join(', ')} pool`
              : 'Gen 1–9 pool'}
          </span>
          {session.voidedRounds > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 800 }}>
              🤝 {session.voidedRounds} voided
            </span>
          )}
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

      {/* Secret clue card */}
      <div className="card" style={{ marginTop: 0, textAlign: 'center', border: '2px solid #ea580c', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fb923c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          {session.phase === 'guess' ? 'Secret Pokémon — which dex is this?' : `Guesses locked (${lockedCount}/2)`}
        </div>
        {session.phase === 'guess' ? (
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '4rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>
            #{String(session.secretDex).padStart(3, '0')}
          </div>
        ) : (
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '4rem', fontWeight: 900, color: '#fdba74', lineHeight: 1 }}>
            #{String(session.secretDex).padStart(3, '0')}
          </div>
        )}
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginTop: '0.4rem' }}>
          {session.phase === 'guess'
            ? `Both players type a Pokémon name — closest dex wins. ${lockedCount}/2 locked.`
            : 'Read the result and draw the next Pokémon.'}
        </div>
      </div>

      {/* Player panels */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {session.players.map((p) => (
          <PlayerDraftPanel
            key={p.id}
            player={p}
            session={session}
            accent={accents[p.id]}
            onLock={(name) => handleLock(p.id, name)}
          />
        ))}
      </div>

      {session.phase === 'resolved' && (
        <ResolutionPanel session={session} onNext={handleNext} />
      )}
    </>
  );
}
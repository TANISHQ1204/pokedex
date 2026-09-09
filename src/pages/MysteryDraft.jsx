import React, { useEffect, useState } from 'react';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import speciesMeta from '../data/speciesMeta.json' with { type: 'json' };
import {
  ATTRIBUTES,
  MAX_TEAM_SIZE,
  createSession,
  draftQueue,
  getAttributeValue,
  nextActor,
  revealAttribute,
  settleAuction,
} from '../game/mysteryDraft';

const MAX_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ATTR_COLORS = {
  name: '#38bdf8',
  color: '#fbbf24',
  generation: '#a78bfa',
  number: '#94a3b8',
  types: '#4ade80',
  species: '#f472b6',
};

function AttributeChip({ attrId, used, active, onClick, size = 'md' }) {
  const color = ATTR_COLORS[attrId] || '#38bdf8';
  const attr = ATTRIBUTES.find((a) => a.id === attrId);
  const chip = (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: size === 'lg' ? '0.65rem 1rem' : '0.35rem 0.75rem',
        borderRadius: '0.5rem',
        fontSize: size === 'lg' ? '0.95rem' : '0.8rem',
        fontWeight: 800,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        border: used ? '2px dashed #475569' : `2px solid ${color}`,
        background: used ? 'rgba(15, 23, 42, 0.8)' : 'rgba(30, 41, 59, 0.9)',
        color: used ? '#475569' : color,
        textDecoration: used ? 'line-through' : 'none',
        opacity: used ? 0.55 : active ? 1 : 0.7,
        boxShadow: active && !used ? `0 0 10px ${color}55` : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {used ? '✕' : '◆'} {attr.label}
    </span>
  );
  return chip;
}

function PlayerPanel({ player, highlight, subtitle }) {
  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        border: highlight ? '2px solid #38bdf8' : '1px solid #334155',
        boxShadow: highlight ? '0 0 18px rgba(56, 189, 248, 0.25)' : 'none',
        flex: 1,
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#f8fafc' }}>
            {player.name}
          </div>
          {subtitle && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
            Budget
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '1.35rem',
              fontWeight: 800,
              color: player.budget <= 0 ? '#ef4444' : '#4ade80',
            }}
          >
            ${player.budget}
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 700 }}>
          ATTRIBUTE TOKENS ({player.usedTokens.length}/6 used)
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {ATTRIBUTES.map((a) => (
            <span key={a.id}>
              <AttributeChip attrId={a.id} used={player.usedTokens.includes(a.id)} />
            </span>
          ))}
        </div>
      </div>

<div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
            WON ({player.won.length}/{MAX_TEAM_SIZE}) {player.won.length > 0 && `• Spent $${player.startBudget - player.budget}`}
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem', minHeight: 30 }}>
          {player.won.map((entry, i) => (
            <span
              key={`${entry.id}-${i}`}
              title={`#${entry.id} ${entry.name}${entry.variant === 'shiny' ? ' (shiny)' : ''}`}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#0f172a',
                border: entry.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img src={entry.sprite} alt={entry.name} style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </span>
          ))}
          {player.won.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>No Pokemon won yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferencePanel({ entry }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card" style={{ marginTop: 0, border: '2px solid #b91c1c' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#fca5a5',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 0,
          fontSize: '0.95rem',
          fontWeight: 800,
          fontFamily: 'inherit',
        }}
      >
        <span>🕵️ Arbitrator Reference — {open ? 'hide' : 'view'}</span>
        <span
          style={{
            background: '#450a0a',
            border: '1px solid #b91c1c',
            color: '#fecaca',
            padding: '0.15rem 0.5rem',
            borderRadius: '0.375rem',
            fontSize: '0.65rem',
            letterSpacing: '0.06em',
          }}
        >
          HIDDEN FROM PLAYERS
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '0.75rem',
              background: '#0f172a',
              border: entry.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #334155',
              boxShadow: entry.variant === 'shiny' ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img src={entry.sprite} alt={entry.name} style={{ width: 84, height: 84, objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              {entry.variant === 'shiny' && (
                <span
                  style={{
                    background: 'linear-gradient(90deg, #b45309, #7e22ce)',
                    color: '#fef08a',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '1rem',
                  }}
                >
                  ★ SHINY
                </span>
              )}
              {entry.rarer && (
                <span
                  style={{
                    background: '#422006',
                    color: '#fde047',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '1rem',
                    border: '1px solid #a16207',
                  }}
                >
                  LEGENDARY / MYTHICAL
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.35rem 1rem' }}>
              {ATTRIBUTES.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700 }}>
                    {a.label}
                  </span>
                  <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right' }}>
                    {getAttributeValue(entry, a.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupScreen({ initial, onStart }) {
  const [nameA, setNameA] = useState(initial?.nameA || '');
  const [nameB, setNameB] = useState(initial?.nameB || '');
  const [budget, setBudget] = useState(initial ? String(initial.budget) : '1000');
  const [maxGen, setMaxGen] = useState(initial?.maxGen ?? 9);
  const [error, setError] = useState('');

  const handleStart = () => {
    const a = nameA.trim();
    const b = nameB.trim();
    const bud = Number(budget);
    if (!a || !b) {
      setError('Enter both player names.');
      return;
    }
    if (a.toLowerCase() === b.toLowerCase()) {
      setError('Player names must be different.');
      return;
    }
    if (!Number.isFinite(bud) || bud < 0 || Math.floor(bud) !== bud) {
      setError('Enter a whole-number budget of 0 or more.');
      return;
    }
    setError('');
    onStart({ nameA: a, nameB: b, budget: bud, maxGen });
  };

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Local Party Game • No saves, no database
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>Mystery Draft Setup</h2>
        <p style={{ margin: '0.4rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          The arbitrator runs this screen. Randomly queue 12 mystery Pokemon; players alternate revealing ONE attribute clue each, then verbally bid their budget — each team caps at 6 Pokemon and $0 (free) bids are allowed.
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
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
            Starting Budget <span style={{ color: '#475569' }}>(shared by both)</span>
          </span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{
              background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
              padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.95rem',
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>
          Maximum Generation <span style={{ color: '#475569' }}>(only Pokemon from Gen 1 through this are eligible — shiny variants &amp; legendaries included)</span>
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
          background: 'linear-gradient(90deg, #0284c7, #0369a1)',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '1.05rem',
          cursor: 'pointer',
          boxShadow: '0 6px 14px rgba(2, 132, 199, 0.35)',
        }}
      >
        🎲 Draft 12 Mystery Pokémon & Start Game
      </button>
    </div>
  );
}

function BidPanel({ state, onSettle }) {
  const [amount, setAmount] = useState('0');
  const [winnerSel, setWinnerSel] = useState(0);

  useEffect(() => {
    setAmount('0');
    setWinnerSel(0);
  }, [state.queueIndex]);

  const eligible = state.players.filter((p) => p.won.length < MAX_TEAM_SIZE);
  const winner = eligible.find((p) => p.id === winnerSel) || eligible[0] || null;
  const winnerId = winner ? winner.id : null;
  const parsed = Number(amount);
  const validAmount = amount.trim() !== '' && Number.isInteger(parsed) && parsed >= 0;
  const affordable = validAmount && winner && parsed <= winner.budget;

  return (
    <div className="card" style={{ marginTop: 0, border: '2px solid #f59e0b' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
        Auction Time
      </div>
      <h3 style={{ margin: '0 0 0.35rem 0', color: '#f8fafc', fontSize: '1.15rem' }}>
        Players call out bids verbally — the arbitrator records the result.
      </h3>
      <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
        The revealed clue is above. Teams cap at {MAX_TEAM_SIZE} Pokemon — a full team can no longer win.
        Free $0 bids are allowed and every winning bid is deducted from that player's budget.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {state.players.map((p) => {
          const full = p.won.length >= MAX_TEAM_SIZE;
          const selected = p.id === winnerId;
          return (
            <button
              key={p.id}
              onClick={() => !full && setWinnerSel(p.id)}
              disabled={full}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                cursor: full ? 'not-allowed' : 'pointer',
                opacity: full ? 0.55 : 1,
                border: selected ? '2px solid #f59e0b' : '1px solid #334155',
                background: selected ? 'rgba(245, 158, 11, 0.12)' : '#1e293b',
                color: '#f8fafc',
                fontWeight: 800,
                textAlign: 'left',
              }}
            >
              <div>{p.name} {full && '· Team full'}</div>
              <div style={{ fontSize: '0.75rem', color: full ? '#f87171' : p.budget <= 0 ? '#ef4444' : '#94a3b8' }}>
                {full
                  ? `Team ${p.won.length}/${MAX_TEAM_SIZE} — cannot win more Pokemon`
                  : `Can bid up to $${p.budget}`}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Winning Bid ($)</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: 140,
              background: '#0f172a', border: affordable ? '1px solid #334155' : '1px solid #ef4444', color: '#f8fafc',
              padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 800,
            }}
          />
        </label>
        <button
          onClick={() => winner && onSettle({ winnerId: winner.id, amount: parsed })}
          disabled={!winner || !validAmount || !affordable}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: winner && validAmount && affordable ? '#16a34a' : '#334155',
            color: winner && validAmount && affordable ? '#ffffff' : '#64748b',
            fontWeight: 900,
            fontSize: '0.95rem',
            cursor: winner && validAmount && affordable ? 'pointer' : 'not-allowed',
          }}
        >
          {winner && validAmount && affordable
            ? `Award to ${winner.name} for $${parsed}`
            : 'Enter a valid bid'}
        </button>
        <button
          onClick={() => onSettle({ winnerId: null, amount: 0 })}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            border: '1px solid #475569',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          No Sale — skip
        </button>
      </div>

      {!validAmount && (
        <div style={{ color: '#fca5a5', fontSize: '0.82rem', fontWeight: 700 }}>
          ⚠️ Bid must be a whole number.
        </div>
      )}
      {validAmount && winner && parsed > winner.budget && (
        <div style={{ color: '#fca5a5', fontSize: '0.82rem', fontWeight: 700 }}>
          ⚠️ {winner.name} only has ${winner.budget} left. Lower the bid or pick the other player.
        </div>
      )}
    </div>
  );
}

function ResultBanner({ result, playerMap }) {
  if (!result || !result.entry) return null;
  const label = result.noSale
    ? 'No sale — nobody claimed it.'
    : `${playerMap[result.winnerId]} won #${String(result.entry.id).padStart(3, '0')} ${result.entry.name} for $${result.amount}`;
  return (
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
      {result.noSale ? '∅ ' : '🏆 '}
      {label}
    </div>
  );
}

export default function MysteryDraft() {
  const [phase, setPhase] = useState('setup');
  const [lastSetup, setLastSetup] = useState(null);
  const [session, setSession] = useState(null);

  const handleStart = ({ nameA, nameB, budget, maxGen }) => {
    setLastSetup({ nameA, nameB, budget, maxGen });
    const queue = draftQueue(pokemonList, speciesMeta, maxGen, 12);
    setSession(createSession({ playerNames: [nameA, nameB], budget, queue }));
    setPhase('playing');
  };

  const handlePlayAgain = () => {
    setSession(null);
    setPhase('setup');
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
          Mystery Draft
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          Reveal clues, bid your budget, build your mystery team. Everything lives in this session only.
        </p>
      </div>

      {phase === 'setup' && (
        <SetupScreen initial={lastSetup} onStart={handleStart} />
      )}

      {phase === 'playing' && session && session.status !== 'summary' && (
        <PlayingView session={session} setSession={setSession} onExit={handlePlayAgain} />
      )}

      {phase === 'playing' && session && session.status === 'summary' && (
        <SummaryView session={session} onPlayAgain={handlePlayAgain} />
      )}

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

/* Helper views are defined lazily below (function hoisting keeps this file tidy). */
function PlayingView({ session, setSession, onExit }) {
  const current = session.queue[session.queueIndex];
  const actor = session.status === 'reveal' ? nextActor(session) : null;
  const playerMap = { [session.players[0].id]: session.players[0].name, [session.players[1].id]: session.players[1].name };

  const handleReveal = (attrId) => {
    if (actor) setSession(revealAttribute(session, actor.playerId, attrId));
  };

  const handleSettle = ({ winnerId, amount }) => {
    setSession(settleAuction(session, { winnerId, amount }));
  };

  const activePlayer = actor ? session.players[actor.playerId] : null;

  return (
    <>
      {/* Progress header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: 0, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc' }}>
          Mystery Pokemon{' '}
          <span style={{ color: '#38bdf8' }}>
            {session.queueIndex + 1}
          </span>
          / {session.queue.length}
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {session.queue.map((entry, i) => {
            const isCurrent = i === session.queueIndex;
            let bg = '#1e293b';
            let title = 'Upcoming';
            if (i < session.queueIndex) {
              const winnerId = session.players.find((p) => p.won.includes(entry));
              if (winnerId) {
                bg = '#166534';
                title = `${winnerId.name} won #${entry.id} ${entry.name}`;
              } else {
                bg = '#7f1d1d';
                title = `No sale — #${entry.id} ${entry.name}`;
              }
            }
            return (
              <span
                key={i}
                title={title}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: bg,
                  border: isCurrent ? '2px solid #f59e0b' : '1px solid #475569',
                  boxShadow: isCurrent ? '0 0 10px rgba(245, 158, 11, 0.7)' : 'none',
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

      <ResultBanner result={session.lastResult} playerMap={playerMap} />

      {/* Player panels */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {session.players.map((p) => (
          <PlayerPanel
            key={p.id}
            player={p}
            highlight={actor && actor.playerId === p.id}
            subtitle={actor && actor.playerId === p.id ? '🎯 Your turn to reveal' : ''}
          />
        ))}
      </div>

      {/* Current mystery Pokemon */}
      {session.status === 'reveal' && actor && activePlayer ? (
        <div className="card" style={{ marginTop: 0, border: '2px solid #38bdf8' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '2rem',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              marginBottom: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>🔍</span>
            <span style={{ color: '#e0f2fe', fontWeight: 800, fontSize: '0.9rem' }}>
              {activePlayer.name}'s turn — reveal ONE clue for this Pokemon, then it goes to auction
            </span>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
            {activePlayer.name}'s available attributes:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {ATTRIBUTES.map((a) => (
              <span key={a.id}>
                <AttributeChip
                  attrId={a.id}
                  size="lg"
                  active
                  used={activePlayer.usedTokens.includes(a.id)}
                  onClick={
                    activePlayer.usedTokens.includes(a.id)
                      ? undefined
                      : () => handleReveal(a.id)
                  }
                />
              </span>
            ))}
          </div>

          <RevealedList state={session} />
        </div>
      ) : session.status === 'reveal' && !actor ? (
        <div className="card" style={{ marginTop: 0 }}>
          <p style={{ margin: 0, color: '#cbd5e1', fontWeight: 700 }}>
            No attributes remain — reveal phase complete.
          </p>
          <button
            onClick={() => setSession({ ...session, status: 'bid' })}
            style={{
              marginTop: '0.75rem',
              padding: '0.7rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#f59e0b',
              color: '#0f172a',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Continue to Auction →
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <RevealedList state={session} />
          </div>
          <BidPanel state={session} onSettle={handleSettle} />
        </>
      )}

      {/* Arbitrator-only memo */}
      <div style={{ marginTop: '1rem' }}>
        <ReferencePanel entry={current} />
      </div>
    </>
  );
}

function RevealedList({ state }) {
  if (state.revealed.length === 0) {
    return (
      <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
        Nothing revealed for this Pokemon yet.
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
        REVEALED FOR THIS POKEMON
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {state.revealed.map((r) => {
          const entry = state.queue[state.queueIndex];
          const attr = ATTRIBUTES.find((a) => a.id === r.attributeId);
          const player = state.players[r.playerId];
          return (
            <span
              key={`${r.playerId}-${r.attributeId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '0.5rem',
                background: 'rgba(15, 23, 42, 0.9)',
                border: `1px solid ${ATTR_COLORS[r.attributeId] || '#38bdf8'}`,
                fontSize: '0.85rem',
              }}
            >
              <span style={{ fontWeight: 800, color: ATTR_COLORS[r.attributeId] || '#38bdf8', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                {attr.label}:
              </span>
              <span style={{ color: '#f8fafc', fontWeight: 800 }}>{getAttributeValue(entry, r.attributeId)}</span>
              <span style={{ color: '#64748b', fontSize: '0.72rem' }}>(by {player.name})</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SummaryView({ session, onPlayAgain }) {
  const champion = [...session.players].sort((a, b) => {
    if (b.budget !== a.budget) return b.budget - a.budget;
    return b.won.length - a.won.length;
  })[0];

  return (
    <div>
      <div className="card" style={{ marginTop: 0, border: '2px solid #f59e0b', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc', fontSize: '1.6rem' }}>🏁 Auction Complete</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          {session.queue.length} mystery Pokemon were on the block.
        </p>
        {session.players.length > 0 && champion && (
          <div
            style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              padding: '0.4rem 1rem',
              borderRadius: '2rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              color: '#fde68a',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            🏆 {champion.name} finishes with the most unspent budget (${champion.budget})
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {session.players.map((p) => {
          return (
            <div className="card" key={p.id} style={{ marginTop: 0, flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc' }}>{p.name}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Final Budget</div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: '#4ade80' }}>${p.budget}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
                POKEMON WON ({p.won.length})
              </div>
              {p.won.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>Won nothing this session.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                  {p.won.map((entry, i) => (
                    <div
                      key={`${entry.id}-${i}`}
                      style={{
                        background: '#0f172a',
                        border: entry.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #334155',
                        borderRadius: '0.6rem',
                        padding: '0.5rem',
                        textAlign: 'center',
                      }}
                    >
                      <img src={entry.sprite} alt={entry.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc' }}>
                        #{String(entry.id).padStart(3, '0')} {entry.name}
                      </div>
                      {entry.variant === 'shiny' && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#fbbf24' }}>★ SHINY</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onPlayAgain}
          style={{
            padding: '0.9rem 2rem',
            borderRadius: '0.6rem',
            border: 'none',
            background: 'linear-gradient(90deg, #0284c7, #0369a1)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 6px 14px rgba(2, 132, 199, 0.35)',
          }}
        >
          Play Again — New Draft
        </button>
      </div>
    </div>
  );
}
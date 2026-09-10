import React, { Component, useEffect, useState } from 'react';
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
  baseStatTotal,
  teamScoreBreakdown,
  pickWinner,
  strongestPick,
  weakestPick,
  TYPE_COVERAGE_BONUS,
  RARE_BONUS,
  SHINY_BONUS,
} from '../game/mysteryDraft';

class DraftErrorBoundary extends Component {
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
            The draft encountered an unexpected error. Your session data may be lost.
          </p>
          <button
            onClick={() => {
              try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (_) {}
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

const MAX_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DRAFT_STORAGE_KEY = 'pokedex_mystery_draft_state';

function saveDraftState(data) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* quota exceeded or private mode — ignore */ }
}

function loadDraftState() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearDraftState() {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (_) { /* ignore */ }
}

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

function PlayerPanel({ player, highlight, subtitle, blind }) {
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
              title={blind ? 'Mystery Pokemon — revealed at the end' : `#${entry.id} ${entry.name} · BST ${entry.bst ?? baseStatTotal(entry)}${entry.variant === 'shiny' ? ' (shiny)' : ''}`}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#0f172a',
                border: blind ? '2px dashed #f59e0b' : entry.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontSize: '0.95rem',
              }}
            >
              {blind ? '❓' : <img src={entry.sprite} alt={entry.name} style={{ width: 28, height: 28, objectFit: 'contain' }} />}
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
  const [blind, setBlind] = useState(initial?.blind ?? false);
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
    onStart({ nameA: a, nameB: b, budget: bud, maxGen, blind });
  };

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Local Party Game • No saves, no database
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>Mystery Draft Setup</h2>
        <p style={{ margin: '0.4rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          The arbitrator runs this screen. Randomly queue 12 mystery Pokemon — legendaries &amp; mythicals are included with equal weight, and ~15% of drafts are shiny. Players alternate revealing ONE attribute clue each, then verbally bid their budget — each team cap at 6 Pokemon and $0 (free) bids are allowed. Enable 🔒 Blind Mode to keep every identity hidden until the final reveal.
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
          Maximum Generation <span style={{ color: '#475569' }}>(only Pokemon from Gen 1 through this are eligible — legendaries included normally, ~15% shiny)</span>
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.9rem',
          marginBottom: '1.25rem',
          padding: '0.9rem 1rem',
          borderRadius: '0.6rem',
          background: blind ? 'rgba(217, 119, 6, 0.12)' : '#1e293b',
          border: blind ? '1px solid #f59e0b' : '1px solid #334155',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        role="button"
        tabIndex={0}
        onClick={() => setBlind((b) => !b)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setBlind((b) => !b);
          }
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            flexShrink: 0,
            background: blind ? 'rgba(245, 158, 11, 0.2)' : '#0f172a',
          }}
        >
          {blind ? '🙈' : '👁️'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, color: '#f8fafc', fontSize: '1rem' }}>Blind Mode</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: blind ? '#0f172a' : '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.15rem 0.55rem',
                borderRadius: '1rem',
                background: blind ? '#f59e0b' : '#334155',
              }}
            >
              {blind ? 'On' : 'Off'}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: blind ? '#fcd34d' : '#94a3b8', marginTop: '0.2rem', lineHeight: '1.35' }}>
            Nobody sees the Pokemon — including the arbitrator — until the final summary.
            Reveals, auctions, and budgets play exactly the same; only the identity is hidden.
          </div>
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

function ResultBanner({ result, playerMap, blind }) {
  if (!result || !result.entry) return null;
  const label = result.noSale
    ? 'No sale — nobody claimed it.'
    : blind
      ? `${playerMap[result.winnerId]} won a mystery Pokemon for $${result.amount}`
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

  const handleStart = ({ nameA, nameB, budget, maxGen, blind }) => {
    setLastSetup({ nameA, nameB, budget, maxGen, blind });
    const queue = draftQueue(pokemonList, speciesMeta, maxGen, 12);
    setSession(createSession({ playerNames: [nameA, nameB], budget, queue, blind }));
    setPhase('playing');
  };

  const handlePlayAgain = () => {
    clearDraftState();
    setSession(null);
    setPhase('setup');
  };

  useEffect(() => {
    // Mirror the CPU battle's refresh-safe persistence: a full browser refresh
    // (F5 / Ctrl+R) always starts a fresh draft; only SPA navigation (tab/route
    // switches) restores the in-progress session.
    let pageWasReloaded = false;
    try {
      const nav = window.performance?.getEntriesByType?.('navigation')?.[0];
      pageWasReloaded = Boolean(nav && nav.type === 'reload');
    } catch (_) {
      /* navigation timing unavailable — ignore */
    }
    if (pageWasReloaded) {
      clearDraftState();
    }

    const saved = loadDraftState();
    if (saved && saved.session && saved.session.status && saved.session.status !== 'summary') {
      setPhase(saved.phase || 'playing');
      setLastSetup(saved.lastSetup || null);
      setSession(saved.session);
    } else {
      clearDraftState();
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    if (phase === 'setup') return;
    if (session.status === 'summary') {
      clearDraftState();
      return;
    }
    saveDraftState({ phase, session, lastSetup });
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
          Mystery Draft
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          Reveal clues, bid your budget, build your mystery team. Everything lives in this session only.
        </p>
      </div>

      <DraftErrorBoundary key={showSummary ? 'summary' : 'playing'}>
        {phase === 'setup' && (
          <SetupScreen initial={lastSetup} onStart={handleStart} />
        )}

        {showPlaying && (
          <PlayingView session={session} setSession={setSession} onExit={handlePlayAgain} />
        )}

        {showSummary && (
          <SummaryView session={session} onPlayAgain={handlePlayAgain} />
        )}
      </DraftErrorBoundary>

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
  if (session.status === 'summary' || session.queueIndex >= session.queue.length) {
    return (
      <div className="card" style={{ marginTop: 0, textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontWeight: 700 }}>All auctions are complete — loading summary...</p>
      </div>
    );
  }
  const current = session.queue[session.queueIndex];
  const actor = session.status === 'reveal' ? nextActor(session) : null;
  const playerMap = { [session.players[0].id]: session.players[0].name, [session.players[1].id]: session.players[1].name };
  const blind = session.blind;

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
                title = blind
                  ? `${winnerId.name} won a mystery Pokemon`
                  : `${winnerId.name} won #${entry.id} ${entry.name}`;
              } else {
                bg = '#7f1d1d';
                title = blind ? 'No sale — mystery Pokemon' : `No sale — #${entry.id} ${entry.name}`;
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

      <ResultBanner result={session.lastResult} playerMap={playerMap} blind={session.blind} />

      {/* Player panels */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {session.players.map((p) => (
          <PlayerPanel
            key={p.id}
            player={p}
            highlight={actor && actor.playerId === p.id}
            subtitle={actor && actor.playerId === p.id ? '🎯 Your turn to reveal' : ''}
            blind={session.blind}
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

      {/* Arbitrator-only memo — swapped for a lock notice in blind mode */}
      <div style={{ marginTop: '1rem' }}>
        {blind ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.9rem 1rem',
              borderRadius: '0.6rem',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px dashed #f59e0b',
              color: '#fcd34d',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>🙈</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>
                Blind mode active — even the arbitrator is in the dark
              </div>
              <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '0.15rem' }}>
                Every Pokemon stays hidden until the final summary. Bid on the clues alone!
              </div>
            </div>
          </div>
        ) : (
          <ReferencePanel entry={current} />
        )}
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
  const champion = pickWinner(session.players);
  const championScore = champion ? teamScoreBreakdown(champion) : null;
  const strongestAll = strongestPick(
    session.players.length > 0
      ? { won: session.players.flatMap((p) => p.won) }
      : null
  );
  const playerScores = session.players.map((p) => ({ player: p, score: teamScoreBreakdown(p) }));

  return (
    <div>
      <div className="card" style={{ marginTop: 0, border: '2px solid #f59e0b', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc', fontSize: '1.6rem' }}>🏁 Auction Complete</h2>
        {session.blind && (
          <div
            style={{
              display: 'inline-block',
              marginBottom: '0.6rem',
              padding: '0.3rem 0.9rem',
              borderRadius: '2rem',
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px dashed #f59e0b',
              color: '#fcd34d',
              fontWeight: 800,
              fontSize: '0.85rem',
            }}
          >
            🔓 Blind mode — every mystery Pokemon revealed at last!
          </div>
        )}
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          {session.queue.length} mystery Pokemon were on the block. The winner is decided by total team
          strength — combined base stats (BST), type coverage, and rarity. Budget is informational only.
        </p>
        {session.players.length > 0 && champion && championScore && (
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
            🏆 {champion.name} wins — best team score of {championScore.total} points
          </div>
        )}

        <div style={{ marginTop: '0.9rem', textAlign: 'left' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.6rem',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid #334155',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>💎</span>
            <span style={{ color: '#cbd5e1', fontWeight: 700, fontSize: '0.9rem' }}>
              Strongest single Pokemon of the session:
            </span>
            {strongestAll && strongestAll.entry ? (
              <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: '0.95rem' }}>
                #{String(strongestAll.entry.id).padStart(3, '0')} {strongestAll.entry.name}
                {strongestAll.entry.variant === 'shiny' ? ' ★' : ''} · BST {strongestAll.bst}
              </span>
            ) : (
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No Pokemon drafted</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {playerScores.map(({ player, score }) => {
          const mvp = strongestPick(player);
          const weak = weakestPick(player);
          return (
            <div
              className="card"
              key={player.id}
              style={{
                marginTop: 0,
                flex: 1,
                minWidth: 300,
                border: champion && champion.id === player.id ? '2px solid #f59e0b' : '1px solid #334155',
                boxShadow: champion && champion.id === player.id ? '0 0 18px rgba(245, 158, 11, 0.25)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc' }}>
                  {player.name}
                  {champion && champion.id === player.id && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#fbbf24' }}>🏆 WINNER</span>
                  )}
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', borderRadius: '0.5rem', padding: '0.1rem 0.7rem' }}>
                  {score.total} pts
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
                SCORE BREAKDOWN
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <ScoreChip label="BST" value={`${score.bst}`} color="#38bdf8" detail={`avg ${player.won.length > 0 ? Math.round(score.bst / player.won.length) : 0}/mon`} />
                <ScoreChip label="Types" value={score.typeBonus} color="#4ade80" detail={`${score.typeCoverage} × ${TYPE_COVERAGE_BONUS}`} />
                <ScoreChip label="Rare" value={score.rareBonus} color="#f472b6" detail={`${score.rare} × ${RARE_BONUS}`} />
                <ScoreChip label="Shiny" value={score.shinyBonus} color="#fbbf24" detail={`${score.shiny} × ${SHINY_BONUS}`} />
              </div>

              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.3rem' }}>
                POKEMON WON ({player.won.length}/{MAX_TEAM_SIZE})
              </div>
              {player.won.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>Won nothing this session.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  {player.won.map((entry, i) => {
                    const isMvp = mvp && mvp.entry.id === entry.id;
                    const isWeak = weak && weak.entry.id === entry.id && player.won.length > 1;
                    return (
                      <div
                        key={`${entry.id}-${i}`}
                        title={`#${entry.id} ${entry.name} · BST ${entry.bst ?? baseStatTotal(entry)}`}
                        style={{
                          background: '#0f172a',
                          border: entry.variant === 'shiny' ? '2px solid #fbbf24' : '1px solid #334155',
                          borderRadius: '0.6rem',
                          padding: '0.5rem',
                          textAlign: 'center',
                          position: 'relative',
                        }}
                      >
                        <img src={entry.sprite} alt={entry.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc' }}>
                          #{String(entry.id).padStart(3, '0')} {entry.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>BST {entry.bst ?? baseStatTotal(entry)}</div>
                        {entry.variant === 'shiny' && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#fbbf24' }}>★ SHINY</div>
                        )}
                        {isMvp && (
                          <div style={{ position: 'absolute', top: -8, right: -8, background: '#b45309', color: '#fef3c7', fontSize: '0.6rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: '1rem', border: '1px solid #fbbf24' }}>
                            ⭐ MVP
                          </div>
                        )}
                        {isWeak && (
                          <div style={{ position: 'absolute', top: -8, left: -8, background: '#7f1d1d', color: '#fecaca', fontSize: '0.6rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: '1rem', border: '1px solid #ef4444' }}>
                            weakest
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Type coverage + budget (info only) */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.3rem' }}>
                    TYPE COVERAGE ({score.typeCoverage})
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {score.types.length === 0 ? (
                      <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>None</span>
                    ) : (
                      score.types.map((t) => (
                        <span
                          key={t}
                          style={{
                            textTransform: 'capitalize',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            background: '#4ade80',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '0.4rem',
                          }}
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Budget — not a factor
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                    Spent ${player.startBudget - player.budget} / left ${player.budget}
                  </div>
                </div>
              </div>
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

function ScoreChip({ label, value, detail, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        padding: '0.3rem 0.65rem',
        borderRadius: '0.5rem',
        background: 'rgba(15, 23, 42, 0.85)',
        border: `1px solid ${color}`,
        minWidth: 64,
      }}
    >
      <span style={{ color, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: '0.95rem' }}>+{value}</span>
      {detail && <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 700 }}>{detail}</span>}
    </span>
  );
}
import React from 'react';
import { getTypeEffectiveness } from '../game/battle';
import PokemonImage from './PokemonImage';

const CELL_STYLE_BY_MULT = {
  0: { bg: 'rgba(127, 29, 29, 0.9)', color: '#fca5a5', label: 'immune' },
  1: { bg: 'rgba(51, 65, 85, 0.45)', color: '#94a3b8', label: null },
  2: { bg: 'rgba(22, 163, 74, 0.85)', color: '#bbf7d0', label: null },
  4: { bg: 'rgba(5, 150, 105, 0.95)', color: '#a7f3d0', label: null },
};

function multStyle(mult) {
  return (
    CELL_STYLE_BY_MULT[mult] || { bg: 'rgba(217, 119, 6, 0.75)', color: '#fde68a', label: null }
  );
}

/** Strongest matchup multiplier a Pokemon can land on a defender with its 4 moves. */
function bestMatchupMultiplier(attacker, defender) {
  let best = 1;
  (attacker.moves || []).forEach((m) => {
    if (m && m.power > 0 && m.type) {
      const eff = getTypeEffectiveness(String(m.type).toLowerCase(), defender && defender.types);
      if (eff > best) best = eff;
    }
  });
  return best;
}

function teamHp(team) {
  const total = Math.max(1, team.reduce((acc, p) => acc + (p.maxHp || 1), 0));
  const current = team.reduce((acc, p) => acc + Math.max(0, p.currentHp || 0), 0);
  return { current, total, pct: Math.round((current / total) * 100) };
}

export default function BattleSummary({ playerTeam, cpuTeam, result = 'player', onContinue }) {
  const win = result === 'player';
  const pTeam = Array.isArray(playerTeam) ? playerTeam : [];
  const cTeam = Array.isArray(cpuTeam) ? cpuTeam : [];
  const pHp = teamHp(pTeam);
  const cHp = teamHp(cTeam);

  const overview = { super: 0, quad: 0, resist: 0, immune: 0, neutral: 0 };
  pTeam.forEach((attacker) =>
    cTeam.forEach((defender) => {
      const mult = bestMatchupMultiplier(attacker, defender);
      if (mult === 0) overview.immune++;
      else if (mult >= 4) overview.quad++;
      else if (mult > 1) overview.super++;
      else if (mult < 1) overview.resist++;
      else overview.neutral++;
    })
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '1rem',
        overflowY: 'auto',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 680,
          width: '100%',
          marginTop: 0,
          padding: '1.5rem',
          border: win ? '2px solid #22c55e' : '2px solid #ef4444',
          boxShadow: win ? '0 20px 25px -5px rgba(34, 197, 94, 0.25)' : '0 20px 25px -5px rgba(239, 68, 68, 0.25)',
        }}
      >
        {/* Result header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.15rem' }}>{win ? '🏆' : '💀'}</div>
          <h2 style={{ fontSize: '1.6rem', margin: 0, color: win ? '#bbf7d0' : '#fca5a5' }}>
            {win ? 'VICTORY!' : 'DEFEAT!'}
          </h2>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Battle report — how your team lined up against the opponent.
          </div>
        </div>

        {/* HP recap */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { label: win ? 'Your team' : 'Your team (wiped)', hp: pHp, color: '#22c55e' },
            { label: win ? 'Opponent (wiped)' : 'Opponent team', hp: cHp, color: '#ef4444' },
          ].map((row) => (
            <div key={row.label} style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
                <span>{row.label.toUpperCase()}</span>
                <span className="stat-number-condensed">{row.hp.current}/{row.hp.total}</span>
              </div>
              <div className="stat-bar-outer">
                <div className="stat-bar-inner" style={{ width: `${Math.min(100, row.hp.pct)}%`, backgroundColor: row.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Type advantage overview */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { label: 'Super effective', n: overview.super, color: '#22c55e' },
            { label: 'Quad damage', n: overview.quad, color: '#059669' },
            { label: 'Resisted', n: overview.resist, color: '#f59e0b' },
            { label: 'No effect', n: overview.immune, color: '#ef4444' },
            { label: 'Neutral', n: overview.neutral, color: '#64748b' },
          ].map((s) => (
            <span
              key={s.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.7rem',
                borderRadius: '2rem',
                background: 'rgba(15, 23, 42, 0.7)',
                border: `1px solid ${s.color}66`,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <span style={{ color: s.color }}>{s.n}</span>
              {s.label}
            </span>
          ))}
        </div>

        {/* Matchup matrix: player moves vs opponent types */}
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          TYPE MATCHUPS — BEST EFFECTIVENESS PER MATCHUP
        </div>
        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.3rem', fontSize: '0.72rem', color: '#94a3b8' }}>You ↓ / Opp →</th>
                {cTeam.map((c) => (
                  <th key={c.instanceId} style={{ padding: '0.3rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                      <PokemonImage pokemon={c} isShiny={Boolean(c.isShiny)} alt={c.name} style={{ width: 34, height: 34, objectFit: 'contain' }} />
                      <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 700, maxWidth: 70, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pTeam.map((p) => (
                <tr key={p.instanceId}>
                  <td style={{ padding: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <PokemonImage pokemon={p} isShiny={Boolean(p.isShiny)} alt={p.name} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                      {p.name}
                    </span>
                  </td>
                  {cTeam.map((c) => {
                    const mult = bestMatchupMultiplier(p, c);
                    const st = multStyle(mult);
                    return (
                      <td key={c.instanceId} style={{ padding: '0.3rem', textAlign: 'center' }}>
                        <span
                          title={st.label ? `${p.name} has no move that affects ${c.name} (immune)` : `${p.name} vs ${c.name}: ×${mult}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 44,
                            padding: '0.2rem 0.45rem',
                            borderRadius: '0.4rem',
                            background: st.bg,
                            color: st.color,
                            fontSize: '0.72rem',
                            fontWeight: 900,
                          }}
                        >
                          {st.label ? (mult === 0 ? '✕' : st.label) : `×${mult}`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {pTeam.length === 0 && (
                <tr>
                  <td colSpan={Math.max(2, cTeam.length + 1)} style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.5rem' }}>
                    No battle data to report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={onContinue}
          style={{
            width: '100%',
            padding: '0.875rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 800,
            color: '#ffffff',
            backgroundColor: win ? '#16a34a' : '#dc2626',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            boxShadow: win ? '0 6px 14px rgba(22, 163, 74, 0.35)' : '0 6px 14px rgba(220, 38, 38, 0.35)',
          }}
        >
          {win ? 'View Card Pull →' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
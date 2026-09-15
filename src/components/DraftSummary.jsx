import React from 'react';
import {
  ATTRIBUTES,
  MAX_TEAM_SIZE,
  baseStatTotal,
  getAttributeValue,
  pickWinner,
  strongestPick,
  weakestPick,
  superlatives,
  teamScoreBreakdown,
  RARE_MULTIPLIER,
  SHINY_MULTIPLIER,
  FORM_MULTIPLIER,
} from '../game/mysteryDraft.js';

const ATTR_COLORS = {
  name: '#38bdf8',
  color: '#fbbf24',
  generation: '#a78bfa',
  number: '#94a3b8',
  types: '#4ade80',
  species: '#f472b6',
};

/**
 * Shared post-game winner summary used by Mystery Draft and Deal or No Deal.
 * Players with `startBudget` get the budget recap; entries with `.hint` get
 * their revealed clue recap. Everything else (scoring, superlatives, MVP,
 * weakest, champion banner) is identical between modes.
 */
export default function DraftSummary({ players, title = '🏁 Game Complete', intro, blind, onPlayAgain, playLabel = 'Play Again — New Game' }) {
  const champion = pickWinner(players);
  const playerScores = players.map((p) => ({ player: p, score: teamScoreBreakdown(p) }));
  const sup = superlatives(players);

  const entryLabel = (e) => `#${String(e.dexNo || e.id).padStart(3, '0')} ${e.display || e.name}`;
  const multLabel = (m) => (m === 1 ? 'no modifiers' : `×${m}`);
  const hasAny = playerScores.some(({ player }) => player.won.length > 0);

  return (
    <div>
      <div className="card" style={{ marginTop: 0, border: '2px solid #f59e0b', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc', fontSize: '1.6rem' }}>{title}</h2>
        {blind && (
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
        <p style={{ margin: '0 auto 0.5rem auto', color: '#94a3b8', fontSize: '0.95rem', maxWidth: 640 }}>
          {intro}
        </p>
        {champion ? (
          <div
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '2rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              color: '#fde68a',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            🏆 {champion.name} wins — best team score of {teamScoreBreakdown(champion).total} points
          </div>
        ) : (
          <div
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '2rem',
              background: 'rgba(148, 163, 184, 0.1)',
              border: '1px solid #64748b',
              color: '#cbd5e1',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            🤝 It's a draw — both teams finished with identical scores!
          </div>
        )}
      </div>

      <SuperlativesSection sup={sup} entryLabel={entryLabel} hasAny={hasAny} />

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
                  {!champion && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>🤝 tied</span>
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
                <ScoreChip label="Raw BST" value={`${score.bst}`} color="#38bdf8" prefix="" detail={`avg ${player.won.length > 0 ? Math.round(score.bst / player.won.length) : 0}/mon`} />
                <ScoreChip label="Rare" value={score.rare} color="#f87272" prefix="" detail={`×${RARE_MULTIPLIER} each`} />
                <ScoreChip label="Shiny" value={score.shiny} color="#fbbf24" prefix="" detail={`×${SHINY_MULTIPLIER} each`} />
                <ScoreChip label="Forms" value={score.forms} color="#a78bfa" prefix="" detail={`×${FORM_MULTIPLIER} each`} />
                <ScoreChip label="Types" value={score.typeCoverage} color="#4ade80" prefix="" detail="distinct" />
              </div>

              {player.won.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Won nothing this session.
                </div>
              ) : (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.6rem', padding: '0.6rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>
                    PER-POKEMON SCORES (sum = {score.total})
                  </div>
                  {score.perPokemon.map(({ entry, mult, score: pts }) => (
                    <div key={`${entry.id}-${entry.variant}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', borderBottom: '1px solid #1e293b', fontSize: '0.82rem' }}>
                      <img src={entry.sprite} alt={entry.name} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
                      <span style={{ color: '#f8fafc', fontWeight: 800, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entryLabel(entry)}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {entry.rarer ? '⭐' : ''}{entry.variant === 'shiny' ? '✨' : ''}{entry.formKind ? '◆' : ''} {multLabel(mult)}
                      </span>
                      <span style={{ color: '#fbbf24', fontWeight: 900, whiteSpace: 'nowrap' }}>{pts} pts</span>
                    </div>
                  ))}
                </div>
              )}

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
                        title={`${entryLabel(entry)} · BST ${entry.bst ?? baseStatTotal(entry)}${entry.paid !== undefined ? ` · paid $${entry.paid}` : ''}`}
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
                          {entryLabel(entry)}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>BST {entry.bst ?? baseStatTotal(entry)}</div>
                        {entry.paid !== undefined && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>paid ${entry.paid}</div>
                        )}
                        {entry.variant === 'shiny' && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#fbbf24' }}>★ SHINY</div>
                        )}
                        {entry.hint && (() => {
                          const attr = ATTRIBUTES.find((a) => a.id === entry.hint.attributeId);
                          const revealer = players.find((p) => p.id === entry.hint.playerId);
                          return (
                            <div style={{ marginTop: '0.15rem', fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>
                              <span style={{ color: ATTR_COLORS[entry.hint.attributeId] || '#38bdf8', textTransform: 'uppercase' }}>{attr.label}:</span>{' '}
                              {getAttributeValue(entry, entry.hint.attributeId)}
                              {revealer && <span style={{ color: '#64748b' }}> · {revealer.name}</span>}
                            </div>
                          );
                        })()}
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

              {/* Type coverage + budget (info only; budget hidden for modes without money) */}
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
                {typeof player.startBudget === 'number' && (
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Budget — not a factor
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                      Spent ${player.startBudget - player.budget} / left ${player.budget}
                    </div>
                  </div>
                )}
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
          {playLabel}
        </button>
      </div>
    </div>
  );
}

function SuperlativesSection({ sup, entryLabel, hasAny }) {
  if (!sup || !hasAny) return null;
  const rows = [
    {
      icon: '💪',
      label: 'Strongest Single Pokemon',
      value: sup.strongest ? `${entryLabel(sup.strongest.entry)} · ${sup.strongest.score} pts` : null,
    },
    {
      icon: '💰',
      label: 'Best Value Pick',
      value: sup.valuePick ? `${entryLabel(sup.valuePick.entry)} · paid $${sup.valuePick.cost}` : null,
    },
    {
      icon: '👑',
      label: 'Most Legendaries / Mythicals',
      value: sup.mostLegendaries ? `${sup.mostLegendaries.player.name} · ${sup.mostLegendaries.count}` : null,
    },
    {
      icon: '🎨',
      label: 'Best Type Coverage',
      value: sup.bestCoverage ? `${sup.bestCoverage.player.name} · ${sup.bestCoverage.count} types` : null,
    },
  ].filter((r) => r.value !== null);

  return (
    <div className="card" style={{ marginTop: '1rem', border: '2px solid #7c3aed' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
        🎉 Fun Superlatives
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid #475569',
              borderRadius: '0.6rem',
              padding: '0.6rem 0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {r.icon} {r.label}
            </span>
            <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: '0.92rem' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreChip({ label, value, detail, color, prefix = '+' }) {
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
      <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: '0.95rem' }}>{prefix}{value}</span>
      {detail && <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 700 }}>{detail}</span>}
    </span>
  );
}
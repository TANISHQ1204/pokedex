import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitPlayerAction } from '../game/mpBattleEngine';
import { updateMatchState } from '../store/matches';
import HpBar from './HpBar';
import BenchRow from './BenchRow';
import BattleLog from './BattleLog';
import { PokeballIcon, SwordsIcon } from './icons/GameIcons';

export default function RealtimeBattleArena({ match, userId, onUpdateState, player1Name, player2Name }) {
  const navigate = useNavigate();
  const { onlineUserIds } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPlayer1 = match?.player_1_id === userId;
  const opponentId = isPlayer1 ? match?.player_2_id : match?.player_1_id;
  const opponentName = isPlayer1 ? (player2Name || 'Opponent') : (player1Name || 'Host');

  const state = match?.state || {};
  const team1 = state.team1 || [];
  const team2 = state.team2 || [];

  const myTeam = isPlayer1 ? team1 : team2;
  const oppTeam = isPlayer1 ? team2 : team1;

  const myActiveIdx = isPlayer1 ? (state.activeIdx1 ?? 0) : (state.activeIdx2 ?? 0);
  const oppActiveIdx = isPlayer1 ? (state.activeIdx2 ?? 0) : (state.activeIdx1 ?? 0);

  const myPending = isPlayer1 ? state.pendingAction1 : state.pendingAction2;
  const oppPending = isPlayer1 ? state.pendingAction2 : state.pendingAction1;

  const revealedOppIndices = isPlayer1 ? (state.revealed2 || [0]) : (state.revealed1 || [0]);

  const myActive = myTeam[myActiveIdx];
  const oppActive = oppTeam[oppActiveIdx];

  // Presence Disconnect Detector: check if opponent is offline
  const isOpponentOnline = Boolean(opponentId && onlineUserIds && onlineUserIds.includes(opponentId));

  const handleSelectMove = async (moveIdx) => {
    if (myPending || isSubmitting || state.winner || myActive?.currentHp <= 0) return;
    setIsSubmitting(true);
    try {
      const nextState = submitPlayerAction({
        state,
        isPlayer1,
        action: { type: 'move', moveIdx },
      });
      await onUpdateState(nextState);
    } catch (err) {
      console.error('Error submitting move:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSwitch = async (targetIdx) => {
    if (myPending || isSubmitting || state.winner || targetIdx === myActiveIdx) return;
    const targetPkmn = myTeam[targetIdx];
    if (!targetPkmn || targetPkmn.currentHp <= 0) return;

    setIsSubmitting(true);
    try {
      const nextState = submitPlayerAction({
        state,
        isPlayer1,
        action: { type: 'switch', targetIdx },
      });
      await onUpdateState(nextState);
    } catch (err) {
      console.error('Error submitting switch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbandonClaimWin = async () => {
    try {
      const winner = isPlayer1 ? 'player1' : 'player2';
      const updatedState = { ...state, winner };
      await updateMatchState(match.id, updatedState);
    } catch (err) {
      console.error('Error claiming win on abandon:', err);
    }
  };

  if (!myActive || !oppActive) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#94a3b8' }}>Initializing Battle Arena state...</p>
      </div>
    );
  }

  // Format opponent bench with Symmetrical Fog-of-War (unrevealed slots show as ???)
  const formattedOppBench = oppTeam.map((pkmn, idx) => {
    if (revealedOppIndices.includes(idx) || idx === oppActiveIdx) {
      return pkmn;
    }
    return {
      ...pkmn,
      name: '???',
      isUnknown: true,
      sprites: { normal: '' },
    };
  });

  const isMyTurnComplete = Boolean(myPending);
  const myWinnerKey = isPlayer1 ? 'player1' : 'player2';
  const isWinner = state.winner === myWinnerKey;
  const isDraw = state.winner === 'draw';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Presence Disconnect Warning Banner */}
      {!isOpponentOnline && opponentId && !state.winner && (
        <div
          style={{
            backgroundColor: '#451a03',
            border: '1px solid #b45309',
            color: '#fef08a',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
          }}
        >
          <span>⚠️ @{opponentName} appears to be offline.</span>
          <button
            onClick={handleAbandonClaimWin}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.25rem',
              border: 'none',
              backgroundColor: '#b45309',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Claim Victory
          </button>
        </div>
      )}

      {/* Main Battle Container */}
      <div className="battle-container" style={{ border: '2px solid #0284c7' }}>
        {/* Arena Display */}
        <div className="battle-arena">
          {/* Opponent Zone (Top) */}
          <div className="opponent-zone">
            <div className="pokemon-status-card">
              <div className="pokemon-status-header">
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                  @{opponentName}'s {oppActive.name.toUpperCase()}
                </span>
                <span>
                  {oppActive.types?.map((t) => (
                    <span key={t} className={`pokemon-type-badge type-${t}`}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>
              <HpBar currentHp={oppActive.currentHp} maxHp={oppActive.maxHp} />
            </div>

            <div className="pokemon-sprite-container">
              <img src={oppActive.sprites?.normal} alt={oppActive.name} />
            </div>
          </div>

          {/* Player Zone (Bottom) */}
          <div className="player-zone">
            <div className="pokemon-sprite-container">
              <img src={myActive.sprites?.normal} alt={myActive.name} />
            </div>

            <div className="pokemon-status-card">
              <div className="pokemon-status-header">
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                  Your {myActive.name.toUpperCase()}
                </span>
                <span>
                  {myActive.types?.map((t) => (
                    <span key={t} className={`pokemon-type-badge type-${t}`}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>
              <HpBar currentHp={myActive.currentHp} maxHp={myActive.maxHp} />
            </div>
          </div>
        </div>

        {/* Bench Rows */}
        <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
            @{opponentName}'s Bench ({revealedOppIndices.length}/6 Revealed)
          </div>
          <BenchRow team={formattedOppBench} activeIndex={oppActiveIdx} onSelectPokemon={() => {}} disabled />

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', margin: '0.85rem 0 0.35rem 0', textTransform: 'uppercase' }}>
            Your Team (Click benched Pokémon to switch)
          </div>
          <BenchRow team={myTeam} activeIndex={myActiveIdx} onSelectPokemon={handleSelectSwitch} disabled={isMyTurnComplete || Boolean(state.winner)} />
        </div>

        {/* Action Controls & Moves Panel */}
        <div style={{ padding: '1.25rem', backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
          {state.winner ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: isWinner ? '#22c55e' : isDraw ? '#f59e0b' : '#ef4444' }}>
                {isWinner ? '🏆 VICTORY!' : isDraw ? '🤝 DRAW!' : 'DEFEAT!'}
              </h2>
              <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
                {isWinner
                  ? `You defeated @${opponentName} in 6v6 live battle!`
                  : `=@${opponentName} won this battle.`}
              </p>
              <button
                onClick={() => navigate('/game-modes')}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Return to Game Modes
              </button>
            </div>
          ) : isMyTurnComplete ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.25rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px dashed #38bdf8',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  margin: '0 auto 0.5rem auto',
                  borderRadius: '50%',
                  border: '3px solid #38bdf8',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}>
                Waiting for @{opponentName} to select a move...
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>
                Select Your Move:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {myActive.moves?.map((move, idx) => {
                  const pp = move.currentPp ?? move.pp;
                  const isDisabled = pp <= 0 || isSubmitting;
                  return (
                    <button
                      key={move.id || idx}
                      onClick={() => handleSelectMove(idx)}
                      disabled={isDisabled}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #475569',
                        backgroundColor: isDisabled ? '#1e293b' : '#0f172a',
                        color: isDisabled ? '#64748b' : '#f8fafc',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{move.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          <span className={`pokemon-type-badge type-${move.type}`}>{move.type}</span> {move.power ? `PWR: ${move.power}` : move.category}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: pp > 0 ? '#38bdf8' : '#ef4444', fontWeight: 700 }}>
                        PP {pp}/{move.pp}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Battle Log */}
        <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderTop: '1px solid #334155' }}>
          <BattleLog logs={state.logs || []} />
        </div>
      </div>
    </div>
  );
}

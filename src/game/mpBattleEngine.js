import {
  generateRandomTeam,
  calculateDamage,
  applyStatusMove,
  STRUGGLE_MOVE,
  checkTurnStartStatus,
  applyEndOfTurnStatus,
  applyStatusCondition,
  getMoveStatusEffect,
  getMoveStatChanges,
  getEffectiveSpeed,
  getTypeEffectiveness,
  getMoveAccuracy,
  isOhkoMove,
  applyStatChange,
} from './battle';

/**
 * Initializes a new 6v6 Multiplayer Battle State object.
 */
export function initMultiplayerMatchState() {
  const team1 = generateRandomTeam(null, 6);
  const team2 = generateRandomTeam(null, 6);

  return {
    team1,
    team2,
    activeIdx1: 0,
    activeIdx2: 0,
    activeState1: { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] },
    activeState2: { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] },
    revealed1: [0], // indices of team 1 revealed to Player 2
    revealed2: [0], // indices of team 2 revealed to Player 1
    pendingAction1: null, // { type: 'move'|'switch', moveIdx?: number, targetIdx?: number }
    pendingAction2: null,
    logs: [{ text: '⚔️ 6v6 Real-Time Battle Started! Choose your move.' }],
    lastEvents: [],
    winner: null,
    turn: 1,
  };
}

/**
 * Submits an action for a player. If both actions are submitted, resolves the turn automatically.
 */
export function submitPlayerAction({ state, isPlayer1, action }) {
  if (!state || state.winner) return state;

  const nextState = JSON.parse(JSON.stringify(state));

  if (isPlayer1) {
    nextState.pendingAction1 = action;
  } else {
    nextState.pendingAction2 = action;
  }

  // If both players submitted actions, resolve the turn
  if (nextState.pendingAction1 && nextState.pendingAction2) {
    return resolveMultiplayerTurn(nextState);
  }

  return nextState;
}

/**
 * Resolves one full battle turn deterministically when both player actions are present.
 */
export function resolveMultiplayerTurn(state) {
  const nextState = JSON.parse(JSON.stringify(state));
  const action1 = nextState.pendingAction1;
  const action2 = nextState.pendingAction2;
  const logs = [];

  const addLog = (text, options = {}) => {
    logs.push({ text, ...options });
  };

  addLog(`--- Turn ${nextState.turn} ---`);

  // Helper functions targeting current state
  const getPkmn = (isP1, idx) => {
    const team = isP1 ? nextState.team1 : nextState.team2;
    return team[idx];
  };

  const updateHp = (isP1, idx, hp) => {
    const team = isP1 ? nextState.team1 : nextState.team2;
    if (team[idx]) {
      team[idx].currentHp = Math.max(0, hp);
      team[idx].isFainted = hp <= 0;
    }
  };

  const deductPp = (isP1, pkmnIdx, moveIdx) => {
    if (moveIdx < 0) return;
    const team = isP1 ? nextState.team1 : nextState.team2;
    const pkmn = team[pkmnIdx];
    if (pkmn && pkmn.moves && pkmn.moves[moveIdx]) {
      const current = pkmn.moves[moveIdx].currentPp ?? pkmn.moves[moveIdx].pp;
      pkmn.moves[moveIdx].currentPp = Math.max(0, current - 1);
    }
  };

  // 1. Resolve Switches (Switches execute before moves)
  if (action1.type === 'switch') {
    const oldPkmn = getPkmn(true, nextState.activeIdx1);
    nextState.activeIdx1 = action1.targetIdx;
    if (!nextState.revealed1.includes(action1.targetIdx)) {
      nextState.revealed1.push(action1.targetIdx);
    }
    nextState.activeState1 = { enteredViaFaint: false, hasAttacked: false, activeBuffs: [] };
    const newPkmn = getPkmn(true, nextState.activeIdx1);
    addLog(`Player 1 withdrew ${oldPkmn.name.toUpperCase()} and sent out ${newPkmn.name.toUpperCase()}!`);
  }

  if (action2.type === 'switch') {
    const oldPkmn = getPkmn(false, nextState.activeIdx2);
    nextState.activeIdx2 = action2.targetIdx;
    if (!nextState.revealed2.includes(action2.targetIdx)) {
      nextState.revealed2.push(action2.targetIdx);
    }
    nextState.activeState2 = { enteredViaFaint: false, hasAttacked: false, activeBuffs: [] };
    const newPkmn = getPkmn(false, nextState.activeIdx2);
    addLog(`Player 2 withdrew ${oldPkmn.name.toUpperCase()} and sent out ${newPkmn.name.toUpperCase()}!`);
  }

  // 2. Resolve Moves
  const movesToExecute = [];

  if (action1.type === 'move') {
    const p1 = getPkmn(true, nextState.activeIdx1);
    const m1 = action1.moveIdx === -1 ? STRUGGLE_MOVE : p1.moves[action1.moveIdx];
    if (m1) {
      movesToExecute.push({ isP1: true, pkmn: p1, move: m1, moveIdx: action1.moveIdx });
    }
  }

  if (action2.type === 'move') {
    const p2 = getPkmn(false, nextState.activeIdx2);
    const m2 = action2.moveIdx === -1 ? STRUGGLE_MOVE : p2.moves[action2.moveIdx];
    if (m2) {
      movesToExecute.push({ isP1: false, pkmn: p2, move: m2, moveIdx: action2.moveIdx });
    }
  }

  // If both players used moves, determine speed order
  if (movesToExecute.length === 2) {
    const p1Speed = getEffectiveSpeed(movesToExecute[0].pkmn);
    const p2Speed = getEffectiveSpeed(movesToExecute[1].pkmn);

    const p1GoesFirst = p1Speed > p2Speed || (p1Speed === p2Speed && Math.random() < 0.5);
    if (!p1GoesFirst) {
      movesToExecute.reverse();
    }
  }

  // Execute each move in order
  for (const attackerInfo of movesToExecute) {
    const attackerIsP1 = attackerInfo.isP1;
    const defenderIsP1 = !attackerIsP1;

    const attacker = getPkmn(attackerIsP1, attackerIsP1 ? nextState.activeIdx1 : nextState.activeIdx2);
    const defender = getPkmn(defenderIsP1, defenderIsP1 ? nextState.activeIdx1 : nextState.activeIdx2);

    if (!attacker || !defender || attacker.currentHp <= 0 || defender.currentHp <= 0) {
      continue;
    }

    const attackerName = `${attackerIsP1 ? 'Player 1' : 'Player 2'}'s ${attacker.name.toUpperCase()}`;
    const defenderName = `${defenderIsP1 ? 'Player 1' : 'Player 2'}'s ${defender.name.toUpperCase()}`;
    const move = attackerInfo.move;

    // Check Turn-Start Status
    const turnStatusRes = checkTurnStartStatus(attacker, move);
    if (turnStatusRes.logs && turnStatusRes.logs.length > 0) {
      turnStatusRes.logs.forEach((log) => addLog(log.text, log.options || {}));
    }

    if (turnStatusRes.cantMove) {
      if (turnStatusRes.hurtSelf) {
        updateHp(attackerIsP1, attackerIsP1 ? nextState.activeIdx1 : nextState.activeIdx2, attacker.currentHp);
      }
      continue;
    }

    if (attackerInfo.moveIdx >= 0 && !move.isStruggle) {
      deductPp(attackerIsP1, attackerIsP1 ? nextState.activeIdx1 : nextState.activeIdx2, attackerInfo.moveIdx);
    }

    addLog(`${attackerName} used ${move.name}!`);

    // Type Immunity Check
    const statChanges = move.category === 'status' ? getMoveStatChanges(move) : [];
    const isSelfTargetStatus =
      move.category === 'status' &&
      (move.healPercent || statChanges.some((c) => c.target === 'self'));

    if (!isSelfTargetStatus && !move.isStruggle) {
      const effectiveness = getTypeEffectiveness(move.type, defender.types);
      if (effectiveness === 0) {
        addLog(`It had no effect on ${defenderName}!`);
        continue;
      }
    }

    // Accuracy Roll
    if (!isSelfTargetStatus && !move.isStruggle) {
      const accuracy = getMoveAccuracy(move);
      if (accuracy < 100) {
        if (Math.random() * 100 > accuracy) {
          addLog(`${attackerName}'s attack missed!`);
          continue;
        }
      }
    }

    // OHKO Move Check
    if (isOhkoMove(move)) {
      updateHp(defenderIsP1, defenderIsP1 ? nextState.activeIdx1 : nextState.activeIdx2, 0);
      addLog(`💥 IT'S A ONE-HIT KO! (Dealt ${defender.currentHp} damage to ${defenderName})`, { isSuperEffective: true });
      continue;
    }

    // Status Category Move
    if (move.category === 'status') {
      const statusRes = applyStatusMove(attacker, move);
      if (statusRes.type === 'heal') {
        const currentHp = attacker.currentHp ?? attacker.stats.hp;
        const newHp = Math.min(attacker.stats.hp, currentHp + statusRes.amount);
        updateHp(attackerIsP1, attackerIsP1 ? nextState.activeIdx1 : nextState.activeIdx2, newHp);
        addLog(`${attackerName} ${statusRes.effectDescription}!`, { isHeal: true });
      } else if (statusRes.type === 'statChange') {
        const changes = statusRes.changes || [];
        for (const change of changes) {
          const targetObj = change.target === 'opponent' ? defender : attacker;
          const targetIsP1 = change.target === 'opponent' ? defenderIsP1 : attackerIsP1;
          const result = applyStatChange(targetObj, change.stat, change.stages);
          if (result.message) {
            addLog(result.message, { isSuperEffective: result.success && change.stages > 0 });
          }
        }
      } else {
        addLog(`${attackerName}'s ${move.name} ${statusRes.effectDescription}!`);
      }

      const statusSpec = getMoveStatusEffect(move);
      if (statusSpec && statusSpec.condition) {
        const inflictRes = applyStatusCondition(defender, statusSpec.condition, 1.0, statusSpec.chance ?? 1.0);
        if (inflictRes.message) {
          addLog(inflictRes.message, { isSuperEffective: inflictRes.success });
        }
      }
      continue;
    }

    // Physical / Special Attacking Move
    const damageRes = calculateDamage(attacker, defender, move);
    const newHp = Math.max(0, defender.currentHp - damageRes.damage);
    updateHp(defenderIsP1, defenderIsP1 ? nextState.activeIdx1 : nextState.activeIdx2, newHp);

    if (damageRes.isSuperEffective) {
      addLog(`It's super effective! (Dealt ${damageRes.damage} damage)`, { isSuperEffective: true });
    } else if (damageRes.isNotVeryEffective) {
      addLog(`It's not very effective... (Dealt ${damageRes.damage} damage)`);
    } else {
      addLog(`Dealt ${damageRes.damage} damage to ${defenderName}.`);
    }

    if (newHp > 0) {
      const statusSpec = getMoveStatusEffect(move);
      if (statusSpec && statusSpec.condition) {
        const inflictRes = applyStatusCondition(defender, statusSpec.condition, 1.0, statusSpec.chance ?? 1.0);
        if (inflictRes.success && inflictRes.message) {
          addLog(inflictRes.message, { isSuperEffective: true });
        }
      }
    }

    if (damageRes.recoil > 0) {
      const newAttackerHp = Math.max(0, attacker.currentHp - damageRes.recoil);
      updateHp(attackerIsP1, attackerIsP1 ? nextState.activeIdx1 : nextState.activeIdx2, newAttackerHp);
      addLog(`${attackerName} took ${damageRes.recoil} recoil damage from Struggle!`, { isFaint: true });
    }
  }

  // 3. End of Turn Status Ticks (Poison / Burn)
  [true, false].forEach((isP1) => {
    const idx = isP1 ? nextState.activeIdx1 : nextState.activeIdx2;
    const pkmn = getPkmn(isP1, idx);
    if (pkmn && pkmn.currentHp > 0) {
      const statusLogs = applyEndOfTurnStatus(pkmn);
      if (statusLogs.length > 0) {
        statusLogs.forEach((l) => addLog(l.text, l.options || {}));
        updateHp(isP1, idx, pkmn.currentHp);
      }
    }
  });

  // 4. Auto-advance active pokemon if fainted
  if (getPkmn(true, nextState.activeIdx1).currentHp <= 0) {
    addLog(`Player 1's ${getPkmn(true, nextState.activeIdx1).name.toUpperCase()} fainted!`, { isFaint: true });
    const nextP1Idx = nextState.team1.findIndex((p) => p.currentHp > 0);
    if (nextP1Idx !== -1) {
      nextState.activeIdx1 = nextP1Idx;
      if (!nextState.revealed1.includes(nextP1Idx)) {
        nextState.revealed1.push(nextP1Idx);
      }
      nextState.activeState1 = { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] };
      addLog(`Player 1 sent out ${nextState.team1[nextP1Idx].name.toUpperCase()}!`);
    }
  }

  if (getPkmn(false, nextState.activeIdx2).currentHp <= 0) {
    addLog(`Player 2's ${getPkmn(false, nextState.activeIdx2).name.toUpperCase()} fainted!`, { isFaint: true });
    const nextP2Idx = nextState.team2.findIndex((p) => p.currentHp > 0);
    if (nextP2Idx !== -1) {
      nextState.activeIdx2 = nextP2Idx;
      if (!nextState.revealed2.includes(nextP2Idx)) {
        nextState.revealed2.push(nextP2Idx);
      }
      nextState.activeState2 = { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] };
      addLog(`Player 2 sent out ${nextState.team2[nextP2Idx].name.toUpperCase()}!`);
    }
  }

  // 5. Check Win Condition
  const p1HasAlive = nextState.team1.some((p) => p.currentHp > 0);
  const p2HasAlive = nextState.team2.some((p) => p.currentHp > 0);

  if (!p1HasAlive && !p2HasAlive) {
    nextState.winner = 'draw';
    addLog('🤝 BATTLE DRAW! All Pokémon on both teams have fainted.', { isSuperEffective: true });
  } else if (!p1HasAlive) {
    nextState.winner = 'player2';
    addLog('🏆 Player 2 won the 6v6 Battle!', { isSuperEffective: true });
  } else if (!p2HasAlive) {
    nextState.winner = 'player1';
    addLog('🏆 Player 1 won the 6v6 Battle!', { isSuperEffective: true });
  }

  // Clear pending actions for next turn
  nextState.pendingAction1 = null;
  nextState.pendingAction2 = null;

  // Append new logs to persistent log history
  nextState.logs = [...(nextState.logs || []), ...logs];
  nextState.turn = (nextState.turn || 1) + 1;

  return nextState;
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  generateRandomTeam,
  calculateDamage,
  applyStatusMove,
  selectCpuMove,
  shouldCpuSwitch,
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
} from '../game/battle';
import { rollCardDrop } from '../game/drops';
import { getUserCollection, awardCard } from '../store/collection';
import { useAuth } from '../context/AuthContext';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import HpBar from '../components/HpBar';
import BenchRow from '../components/BenchRow';
import BattleLog from '../components/BattleLog';
import CardPullReveal from '../components/CardPullReveal';

export default function Battle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playerTeam, setPlayerTeam] = useState([]);
  const [cpuTeam, setCpuTeam] = useState([]);
  const [playerActiveIdx, setPlayerActiveIdx] = useState(0);
  const [cpuActiveIdx, setCpuActiveIdx] = useState(0);
  const [revealedCpuIndices, setRevealedCpuIndices] = useState(new Set([0]));

  // Active combatant states (switching rules & status buff badges)
  const [playerActiveState, setPlayerActiveState] = useState({
    enteredViaFaint: true,
    hasAttacked: false,
    activeBuffs: [],
  });

  const [cpuActiveState, setCpuActiveState] = useState({
    enteredViaFaint: true,
    hasAttacked: false,
    activeBuffs: [],
  });

  const [logs, setLogs] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [winner, setWinner] = useState(null); // 'player' | 'cpu' | null
  const [awardedDrop, setAwardedDrop] = useState(null); // { pokemon, isNew, entry, starUpgraded, becameShiny }

  // Animation states
  const [lungeSide, setLungeSide] = useState(null); // 'player' | 'cpu' | null
  const [hurtSide, setHurtSide] = useState(null); // 'player' | 'cpu' | null
  const [faintSide, setFaintSide] = useState(null); // 'player' | 'cpu' | null
  const [superShake, setSuperShake] = useState(false);
  const [ohkoFlash, setOhkoFlash] = useState(false);
  const [activeProjectile, setActiveProjectile] = useState(null); // { type, side }
  const [healGlowSide, setHealGlowSide] = useState(null); // 'player' | 'cpu' | null

  // Ref for synchronous state tracking across async delays
  const battleStateRef = useRef({
    playerTeam: [],
    cpuTeam: [],
    playerIdx: 0,
    cpuIdx: 0,
    playerActiveState: { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] },
    cpuActiveState: { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] },
  });

  const startNewBattle = () => {
    const pTeam = generateRandomTeam(null, 6);
    const cTeam = generateRandomTeam(null, 6);

    const initPState = { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] };
    const initCState = { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] };

    setPlayerTeam(pTeam);
    setCpuTeam(cTeam);
    setPlayerActiveIdx(0);
    setCpuActiveIdx(0);
    setRevealedCpuIndices(new Set([0]));
    setPlayerActiveState(initPState);
    setCpuActiveState(initCState);

    setLogs([{ text: 'A wild 6v6 Trainer Battle has begun! Select a move or click a benched Pokémon to switch.' }]);
    setWinner(null);
    setAwardedDrop(null);
    setIsBusy(false);

    battleStateRef.current = {
      playerTeam: pTeam,
      cpuTeam: cTeam,
      playerIdx: 0,
      cpuIdx: 0,
      playerActiveState: initPState,
      cpuActiveState: initCState,
    };
  };

  useEffect(() => {
    startNewBattle();
  }, []);

  const addLog = (text, options = {}) => {
    setLogs((prev) => [...prev, { text, ...options }]);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getActiveIndex = (side) => {
    return side === 'player' ? battleStateRef.current.playerIdx : battleStateRef.current.cpuIdx;
  };

  const getActivePokemon = (side) => {
    const team = side === 'player' ? battleStateRef.current.playerTeam : battleStateRef.current.cpuTeam;
    const idx = getActiveIndex(side);
    return team[idx];
  };

  const updatePokemonHp = (side, index, newHp) => {
    const teamKey = side === 'player' ? 'playerTeam' : 'cpuTeam';
    const updatedTeam = [...battleStateRef.current[teamKey]];
    if (!updatedTeam[index]) return;

    updatedTeam[index] = {
      ...updatedTeam[index],
      currentHp: newHp,
      isFainted: newHp <= 0,
    };

    battleStateRef.current[teamKey] = updatedTeam;
    if (side === 'player') setPlayerTeam(updatedTeam);
    else setCpuTeam(updatedTeam);
  };

  const syncTeamState = (side) => {
    const teamKey = side === 'player' ? 'playerTeam' : 'cpuTeam';
    const updatedTeam = [...battleStateRef.current[teamKey]];
    if (side === 'player') setPlayerTeam(updatedTeam);
    else setCpuTeam(updatedTeam);
  };

  const addBuffBadge = (side, badgeText) => {
    if (!badgeText) return;
    const stateKey = side === 'player' ? 'playerActiveState' : 'cpuActiveState';
    const currentState = battleStateRef.current[stateKey];
    if (currentState.activeBuffs.includes(badgeText)) return;

    const updatedState = {
      ...currentState,
      activeBuffs: [...currentState.activeBuffs, badgeText],
    };

    battleStateRef.current[stateKey] = updatedState;
    if (side === 'player') setPlayerActiveState(updatedState);
    else setCpuActiveState(updatedState);
  };

  const markAttacked = (side) => {
    const stateKey = side === 'player' ? 'playerActiveState' : 'cpuActiveState';
    const currentState = battleStateRef.current[stateKey];
    if (currentState.hasAttacked) return;

    const updatedState = {
      ...currentState,
      hasAttacked: true,
    };

    battleStateRef.current[stateKey] = updatedState;
    if (side === 'player') setPlayerActiveState(updatedState);
    else setCpuActiveState(updatedState);
  };

  const deductMovePp = (side, pokemonIdx, moveIdx) => {
    if (moveIdx < 0) return;
    const teamKey = side === 'player' ? 'playerTeam' : 'cpuTeam';
    const updatedTeam = [...battleStateRef.current[teamKey]];
    const pkmn = updatedTeam[pokemonIdx];
    if (!pkmn || !pkmn.moves[moveIdx]) return;

    const moves = [...pkmn.moves];
    const currentPp = Math.max(0, (moves[moveIdx].currentPp ?? moves[moveIdx].pp) - 1);
    moves[moveIdx] = {
      ...moves[moveIdx],
      currentPp,
    };

    updatedTeam[pokemonIdx] = {
      ...pkmn,
      moves,
    };

    battleStateRef.current[teamKey] = updatedTeam;
    if (side === 'player') setPlayerTeam(updatedTeam);
    else setCpuTeam(updatedTeam);
  };

  // Check if player can switch under the "Must attack once unless entered via faint" rule
  const canPlayerSwitch = playerActiveState.enteredViaFaint || playerActiveState.hasAttacked;

  // Player Manual Switch Handler
  const handlePlayerSwitch = async (newIdx) => {
    if (isBusy || winner || newIdx === playerActiveIdx || !canPlayerSwitch) return;
    const targetPkmn = playerTeam[newIdx];
    if (!targetPkmn || targetPkmn.currentHp <= 0) return;

    setIsBusy(true);
    try {
      const oldPkmn = getActivePokemon('player');
      addLog(`You withdrew ${oldPkmn.name.toUpperCase()} and sent out ${targetPkmn.name.toUpperCase()}!`);

      setFaintSide('player');
      await delay(400);
      setFaintSide(null);

      // Update state for new active player Pokémon (voluntary switch)
      const newPState = { enteredViaFaint: false, hasAttacked: false, activeBuffs: [] };
      battleStateRef.current.playerIdx = newIdx;
      battleStateRef.current.playerActiveState = newPState;
      setPlayerActiveIdx(newIdx);
      setPlayerActiveState(newPState);

      await delay(400);

      // CPU turn action after player switch
      const currentCpu = getActivePokemon('cpu');
      const newPlayer = getActivePokemon('player');

      if (currentCpu && currentCpu.currentHp > 0) {
        const canCpuSwitchNow = battleStateRef.current.cpuActiveState.enteredViaFaint || battleStateRef.current.cpuActiveState.hasAttacked;
        const cpuSwitchIdx = canCpuSwitchNow ? shouldCpuSwitch(battleStateRef.current.cpuTeam, battleStateRef.current.cpuIdx, newPlayer) : null;
        
        if (cpuSwitchIdx !== null) {
          await executeCpuSwitch(cpuSwitchIdx);
        } else {
          const { moveIdx: cpuMoveIdx, move: cpuMove } = selectCpuMove(currentCpu, newPlayer);
          if (cpuMove) {
            await executeTurn(
              { side: 'cpu', pkmn: currentCpu, move: cpuMove, moveIdx: cpuMoveIdx },
              { side: 'player', pkmn: newPlayer }
            );
            await processEndOfTurnStatus();
            await handleFaintCheck();
          }
        }
      }
    } catch (err) {
      console.error('Error during player switch:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const executeCpuSwitch = async (newCpuIdx) => {
    const oldCpu = getActivePokemon('cpu');
    const newCpu = battleStateRef.current.cpuTeam[newCpuIdx];
    if (!newCpu) return;

    addLog(`Opponent withdrew ${oldCpu.name.toUpperCase()} and sent out ${newCpu.name.toUpperCase()}!`);

    setFaintSide('cpu');
    await delay(400);
    setFaintSide(null);

    const newCState = { enteredViaFaint: false, hasAttacked: false, activeBuffs: [] };
    battleStateRef.current.cpuIdx = newCpuIdx;
    battleStateRef.current.cpuActiveState = newCState;
    setCpuActiveIdx(newCpuIdx);
    setRevealedCpuIndices((prev) => new Set([...prev, newCpuIdx]));
    setCpuActiveState(newCState);

    await delay(400);
  };

  const handleMoveSelect = async (selectedMoveIdx) => {
    if (isBusy || winner) return;

    setIsBusy(true);
    try {
      let playerPkmn = getActivePokemon('player');
      let cpuPkmn = getActivePokemon('cpu');

      if (!playerPkmn || !cpuPkmn || playerPkmn.currentHp <= 0 || cpuPkmn.currentHp <= 0) {
        return;
      }

      let playerMove = null;
      if (selectedMoveIdx === -1) {
        playerMove = STRUGGLE_MOVE;
      } else {
        playerMove = playerPkmn.moves[selectedMoveIdx];
      }

      if (!playerMove || (playerMove.currentPp <= 0 && !playerMove.isStruggle)) {
        return;
      }

      // Check if CPU decides to switch BEFORE moves execute
      const canCpuSwitchNow = battleStateRef.current.cpuActiveState.enteredViaFaint || battleStateRef.current.cpuActiveState.hasAttacked;
      const cpuSwitchIdx = canCpuSwitchNow ? shouldCpuSwitch(battleStateRef.current.cpuTeam, battleStateRef.current.cpuIdx, playerPkmn) : null;
      
      if (cpuSwitchIdx !== null) {
        await executeCpuSwitch(cpuSwitchIdx);
        cpuPkmn = getActivePokemon('cpu');

        const fainted = await executeTurn(
          { side: 'player', pkmn: playerPkmn, move: playerMove, moveIdx: selectedMoveIdx },
          { side: 'cpu', pkmn: cpuPkmn }
        );
        await processEndOfTurnStatus();
        if (fainted || (playerPkmn.currentHp <= 0) || (cpuPkmn.currentHp <= 0)) {
          await handleFaintCheck();
        }
        return;
      }

      const { moveIdx: cpuMoveIdx, move: cpuMove } = selectCpuMove(cpuPkmn, playerPkmn);
      if (!cpuMove) return;

      const playerSpeed = getEffectiveSpeed(playerPkmn);
      const cpuSpeed = getEffectiveSpeed(cpuPkmn);
      const playerFirst = playerSpeed > cpuSpeed || (playerSpeed === cpuSpeed && Math.random() < 0.5);

      const firstAttacker = playerFirst
        ? { side: 'player', pkmn: playerPkmn, move: playerMove, moveIdx: selectedMoveIdx }
        : { side: 'cpu', pkmn: cpuPkmn, move: cpuMove, moveIdx: cpuMoveIdx };

      const secondAttacker = playerFirst
        ? { side: 'cpu', pkmn: cpuPkmn, move: cpuMove, moveIdx: cpuMoveIdx }
        : { side: 'player', pkmn: playerPkmn, move: playerMove, moveIdx: selectedMoveIdx };

      const fainted1 = await executeTurn(firstAttacker, secondAttacker);
      if (fainted1) {
        await handleFaintCheck();
        return;
      }

      await delay(300);

      const currentSecondAttacker = getActivePokemon(secondAttacker.side);
      if (currentSecondAttacker && currentSecondAttacker.currentHp > 0) {
        const fainted2 = await executeTurn(secondAttacker, firstAttacker);
        if (fainted2) {
          await handleFaintCheck();
          return;
        }
      }

      // End of turn status damage ticks (Poison & Burn)
      await processEndOfTurnStatus();
      await handleFaintCheck();
    } catch (err) {
      console.error('Error during move execution:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const processEndOfTurnStatus = async () => {
    const pPkmn = getActivePokemon('player');
    const cPkmn = getActivePokemon('cpu');

    if (pPkmn && pPkmn.currentHp > 0) {
      const pLogs = applyEndOfTurnStatus(pPkmn);
      if (pLogs.length > 0) {
        pLogs.forEach((l) => addLog(l.text, l.options || {}));
        updatePokemonHp('player', getActiveIndex('player'), pPkmn.currentHp);
        setHurtSide('player');
        await delay(350);
        setHurtSide(null);
      }
    }

    if (cPkmn && cPkmn.currentHp > 0) {
      const cLogs = applyEndOfTurnStatus(cPkmn);
      if (cLogs.length > 0) {
        cLogs.forEach((l) => addLog(l.text, l.options || {}));
        updatePokemonHp('cpu', getActiveIndex('cpu'), cPkmn.currentHp);
        setHurtSide('cpu');
        await delay(350);
        setHurtSide(null);
      }
    }
  };

  const executeTurn = async (attackerInfo, defenderInfo) => {
    const attackerSide = attackerInfo.side;
    const defenderSide = defenderInfo.side;
    const move = attackerInfo.move;
    const moveIdx = attackerInfo.moveIdx;

    const attacker = getActivePokemon(attackerSide);
    const defender = getActivePokemon(defenderSide);

    if (!attacker || !defender || attacker.currentHp <= 0 || defender.currentHp <= 0) {
      return false;
    }

    // 1. Check Turn-Start Status (Sleep, Freeze, Paralysis, Confusion)
    const turnStatusRes = checkTurnStartStatus(attacker, move);
    if (turnStatusRes.logs && turnStatusRes.logs.length > 0) {
      turnStatusRes.logs.forEach((log) => addLog(log.text, log.options || {}));
    }
    syncTeamState(attackerSide);

    if (turnStatusRes.cantMove) {
      if (turnStatusRes.hurtSelf) {
        setHurtSide(attackerSide);
        await delay(400);
        setHurtSide(null);
        updatePokemonHp(attackerSide, getActiveIndex(attackerSide), attacker.currentHp);
      }
      await delay(300);
      return attacker.currentHp <= 0;
    }

    // Mark that this attacker has attacked
    markAttacked(attackerSide);

    const attackerName = attackerSide === 'player' ? attacker.name.toUpperCase() : `Opponent's ${attacker.name.toUpperCase()}`;
    const defenderName = defenderSide === 'player' ? defender.name.toUpperCase() : `Opponent's ${defender.name.toUpperCase()}`;

    if (moveIdx >= 0 && !move.isStruggle) {
      deductMovePp(attackerSide, getActiveIndex(attackerSide), moveIdx);
    }

    addLog(`${attackerName} used ${move.name}!`);

    setLungeSide(attackerSide);
    await delay(300);
    setLungeSide(null);

    // 2. Type Immunity Check (BEFORE Accuracy Roll!)
    // Self-targeted status moves (healing / stat boosts to self) bypass type immunity
    // and accuracy checks — they always succeed regardless of type matchup.
    // Use getMoveStatChanges() to cover ALL self-buff moves (Swords Dance, Harden,
    // Agility, etc.), not just those with a statBuff field in the JSON.
    const _statChanges = move.category === 'status' ? getMoveStatChanges(move) : [];
    const isSelfTargetStatus =
      move.category === 'status' &&
      (move.healPercent || _statChanges.some((c) => c.target === 'self'));
    if (!isSelfTargetStatus && !move.isStruggle) {
      const effectiveness = getTypeEffectiveness(move.type, defender.types);
      if (effectiveness === 0) {
        addLog(`It had no effect on ${defenderName}!`);
        await delay(300);
        return false;
      }
    }

    // 3. Move Accuracy Roll
    if (!isSelfTargetStatus && !move.isStruggle) {
      const accuracy = getMoveAccuracy(move);
      if (accuracy < 100) {
        const hitRoll = Math.random() * 100;
        if (hitRoll > accuracy) {
          addLog(`${attackerName}'s attack missed!`);
          await delay(300);
          return false;
        }
      }
    }

    // 4. One-Hit KO Move Check (Fissure, Guillotine, Horn Drill, Sheer Cold)
    if (isOhkoMove(move)) {
      setActiveProjectile({ type: move.type, side: attackerSide });
      await delay(450);
      setActiveProjectile(null);

      const ohkoDamage = defender.currentHp;
      setHurtSide(defenderSide);
      setSuperShake(true);
      setOhkoFlash(true);
      await delay(750);
      setHurtSide(null);
      setSuperShake(false);
      setOhkoFlash(false);

      updatePokemonHp(defenderSide, getActiveIndex(defenderSide), 0);
      addLog(`💥 IT'S A ONE-HIT KO! (Dealt ${ohkoDamage} damage to ${defenderName})`, { isSuperEffective: true });

      await delay(400);
      return true;
    }

    // 5. Handle Standard Status Category Moves
    if (move.category === 'status') {
      const statusRes = applyStatusMove(attacker, move);
      if (statusRes.type === 'heal') {
        setHealGlowSide(attackerSide);
        await delay(600);
        setHealGlowSide(null);

        const currentHp = attacker.currentHp ?? attacker.stats.hp;
        const newHp = Math.min(attacker.stats.hp, currentHp + statusRes.amount);
        updatePokemonHp(attackerSide, getActiveIndex(attackerSide), newHp);

        addLog(`${attackerName} ${statusRes.effectDescription}!`, { isHeal: true });
      } else if (statusRes.type === 'statChange') {
        const changes = statusRes.changes || [];
        for (const change of changes) {
          const targetObj = change.target === 'opponent' ? defender : attacker;
          const targetSide = change.target === 'opponent' ? defenderSide : attackerSide;
          const result = applyStatChange(targetObj, change.stat, change.stages);
          if (result.message) {
            addLog(result.message, { isSuperEffective: result.success && change.stages > 0 });
          }
          syncTeamState(targetSide);
        }
      } else if (statusRes.type === 'buff') {
        if (statusRes.buffBadge) {
          addBuffBadge(attackerSide, statusRes.buffBadge);
        }
        addLog(`${attackerName}'s ${move.name} ${statusRes.effectDescription}!`);
      } else {
        addLog(`${attackerName}'s ${move.name} ${statusRes.effectDescription}!`);
      }

      // Check if move inflicts a status condition (e.g. Thunder Wave, Will-O-Wisp, Toxic, Sleep Powder)
      const statusSpec = getMoveStatusEffect(move);
      if (statusSpec && statusSpec.condition) {
        const inflictRes = applyStatusCondition(defender, statusSpec.condition, 1.0, statusSpec.chance ?? 1.0);
        if (inflictRes.message) {
          addLog(inflictRes.message, { isSuperEffective: inflictRes.success });
        }
        syncTeamState(defenderSide);
      }

      await delay(300);
      return false;
    }

    // 6. Handle Standard Attacking Category Moves (Physical / Special)
    setActiveProjectile({ type: move.type, side: attackerSide });
    await delay(450);
    setActiveProjectile(null);

    const damageRes = calculateDamage(attacker, defender, move);

    setHurtSide(defenderSide);
    if (damageRes.isSuperEffective) {
      setSuperShake(true);
    }
    await delay(400);
    setHurtSide(null);
    setSuperShake(false);

    const newDefenderHp = Math.max(0, defender.currentHp - damageRes.damage);
    updatePokemonHp(defenderSide, getActiveIndex(defenderSide), newDefenderHp);

    if (damageRes.isSuperEffective) {
      addLog(`It's super effective! (Dealt ${damageRes.damage} damage)`, { isSuperEffective: true });
    } else if (damageRes.isNotVeryEffective) {
      addLog(`It's not very effective... (Dealt ${damageRes.damage} damage)`);
    } else {
      addLog(`Dealt ${damageRes.damage} damage to ${defenderName}.`);
    }

    // Secondary Status Effect Check for damaging moves (e.g. Thunderbolt 10% par, Flamethrower 10% brn, Sludge Bomb 30% psn)
    if (newDefenderHp > 0) {
      const statusSpec = getMoveStatusEffect(move);
      if (statusSpec && statusSpec.condition) {
        const inflictRes = applyStatusCondition(defender, statusSpec.condition, 1.0, statusSpec.chance ?? 1.0);
        if (inflictRes.success && inflictRes.message) {
          addLog(inflictRes.message, { isSuperEffective: true });
          syncTeamState(defenderSide);
        }
      }
    }

    if (damageRes.recoil > 0) {
      const currentAttackerHp = attacker.currentHp;
      const newAttackerHp = Math.max(0, currentAttackerHp - damageRes.recoil);
      updatePokemonHp(attackerSide, getActiveIndex(attackerSide), newAttackerHp);
      addLog(`${attackerName} took ${damageRes.recoil} recoil damage from Struggle!`, { isFaint: true });
    }

    await delay(400);
    return newDefenderHp <= 0;
  };

  const handleFaintCheck = async () => {
    const { playerTeam, cpuTeam, playerIdx, cpuIdx } = battleStateRef.current;

    // Check Player Faint
    if (playerTeam[playerIdx] && playerTeam[playerIdx].currentHp <= 0) {
      setFaintSide('player');
      addLog(`${playerTeam[playerIdx].name.toUpperCase()} fainted!`, { isFaint: true });
      await delay(700);
      setFaintSide(null);

      const nextPlayerIdx = playerTeam.findIndex((p) => p.currentHp > 0);
      if (nextPlayerIdx === -1) {
        setWinner('cpu');
        addLog('DEFEAT! All your Pokémon have fainted.', { isFaint: true });
        return true;
      }

      // Next player active entered via faint (eligible to switch immediately!)
      const newPState = { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] };
      battleStateRef.current.playerIdx = nextPlayerIdx;
      battleStateRef.current.playerActiveState = newPState;
      setPlayerActiveIdx(nextPlayerIdx);
      setPlayerActiveState(newPState);

      addLog(`Go! ${playerTeam[nextPlayerIdx].name.toUpperCase()}!`);
      await delay(400);
    }

    // Check CPU Faint
    if (cpuTeam[cpuIdx] && cpuTeam[cpuIdx].currentHp <= 0) {
      setFaintSide('cpu');
      addLog(`Opponent's ${cpuTeam[cpuIdx].name.toUpperCase()} fainted!`, { isFaint: true });
      await delay(700);
      setFaintSide(null);

      const nextCpuIdx = cpuTeam.findIndex((p) => p.currentHp > 0);
      if (nextCpuIdx === -1) {
        setWinner('player');
        addLog('VICTORY! You defeated the Opponent Trainer!', { isSuperEffective: true });

        if (user?.id) {
          try {
            const userColl = await getUserCollection(user.id);
            const droppedPkmn = rollCardDrop(userColl, pokemonList);
            const awardRes = await awardCard(user.id, droppedPkmn.id);

            setAwardedDrop({
              pokemon: droppedPkmn,
              ...awardRes,
            });

            addLog(`🎁 You earned a card drop: ${droppedPkmn.name.toUpperCase()}!`, { isSuperEffective: true });
          } catch (err) {
            console.error('Error awarding card drop:', err);
          }
        } else {
          const droppedPkmn = rollCardDrop([], pokemonList);
          setAwardedDrop({
            pokemon: droppedPkmn,
            isNew: true,
            entry: { star_level: 1, dupes_collected: 0, is_shiny: false },
          });
        }

        return true;
      }

      const newCState = { enteredViaFaint: true, hasAttacked: false, activeBuffs: [] };
      battleStateRef.current.cpuIdx = nextCpuIdx;
      battleStateRef.current.cpuActiveState = newCState;
      setCpuActiveIdx(nextCpuIdx);
      setRevealedCpuIndices((prev) => new Set([...prev, nextCpuIdx]));
      setCpuActiveState(newCState);

      addLog(`Opponent sent out ${cpuTeam[nextCpuIdx].name.toUpperCase()}!`);
      await delay(400);
    }

    return false;
  };

  const playerActive = playerTeam[playerActiveIdx];
  const cpuActive = cpuTeam[cpuActiveIdx];

  if (!playerActive || !cpuActive) {
    return <div className="page-container" style={{ color: '#94a3b8' }}>Initializing Battle...</div>;
  }

  const hasUsableMove = playerActive.moves?.some((m) => (m.currentPp ?? m.pp) > 0);

  const renderStatBadges = (pokemon) => {
    if (!pokemon || !pokemon.statStages) return null;
    const labels = {
      attack: 'ATK', defense: 'DEF', specialAttack: 'SP.ATK',
      specialDefense: 'SP.DEF', speed: 'SPD', accuracy: 'ACC', evasion: 'EVA',
    };
    const badges = [];
    Object.entries(pokemon.statStages).forEach(([stat, stage]) => {
      if (stage !== 0) {
        const sign = stage > 0 ? '+' : '';
        badges.push(
          <span key={stat} className={`status-badge ${stage > 0 ? 'stat-stage-up' : 'stat-stage-down'}`}>
            {labels[stat] || stat} {sign}{stage}
          </span>
        );
      }
    });
    return badges.length > 0 ? <div className="status-badge-container">{badges}</div> : null;
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>6v6 Starter Battle Arena</h1>
        <button
          onClick={startNewBattle}
          disabled={isBusy}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#334155',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Reset Battle
        </button>
      </div>

      <div className={`battle-container ${superShake ? 'super-shake' : ''} ${ohkoFlash ? 'ohko-shake' : ''}`}>
        {/* OHKO Dramatic Flash Screen Overlay */}
        {ohkoFlash && <div className="ohko-flash-overlay" />}

        {/* Particle/Projectile Overlay */}
        <div className="projectile-overlay">
          {activeProjectile && (
            <div
              className={`projectile projectile-${activeProjectile.type}`}
              style={{
                '--start-x': activeProjectile.side === 'player' ? '25%' : '75%',
                '--start-y': activeProjectile.side === 'player' ? '70%' : '20%',
                '--end-x': activeProjectile.side === 'player' ? '75%' : '25%',
                '--end-y': activeProjectile.side === 'player' ? '20%' : '70%',
              }}
            />
          )}
        </div>

        {/* BATTLE ARENA */}
        <div className="battle-arena">
          {/* OPPONENT TOP ZONE */}
          <div className="opponent-zone">
            <div className="pokemon-status-card">
              <div className="pokemon-status-header">
                <span>{cpuActive.name}</span>
                <span>
                  {cpuActive.types.map((t) => (
                    <span key={t} className={`pokemon-type-badge type-${t}`}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>

              <HpBar currentHp={cpuActive.currentHp} maxHp={cpuActive.maxHp} />

              {/* CPU Status Badges */}
              {(cpuActive.status !== 'none' || cpuActive.confusion) && (
                <div className="status-badge-container">
                  {cpuActive.status && cpuActive.status !== 'none' && (
                    <span className={`status-badge status-${cpuActive.status.slice(0, 3)}`}>
                      {cpuActive.status === 'paralysis' ? 'PAR' : cpuActive.status === 'poison' ? 'PSN' : cpuActive.status === 'burn' ? 'BRN' : cpuActive.status === 'sleep' ? 'SLP' : 'FRZ'}
                    </span>
                  )}
                  {cpuActive.confusion && (
                    <span className="status-badge status-conf">
                      CONF
                    </span>
                  )}
                </div>
              )}

              {/* CPU Stat Stage Badges */}
              {renderStatBadges(cpuActive)}
            </div>

            <div className="pokemon-sprite-container">
              <div
                className={`
                  ${lungeSide === 'cpu' ? 'lunge-opponent' : ''}
                  ${hurtSide === 'cpu' ? 'hurt-shake' : ''}
                  ${faintSide === 'cpu' ? 'faint-drop' : ''}
                  ${cpuActive.status === 'sleep' ? 'status-overlay-slp' : ''}
                `}
              >
                <img src={cpuActive.sprites.normal} alt={cpuActive.name} />
              </div>

              {/* CPU Status Visual Effect Overlays */}
              {cpuActive.status === 'freeze' && <div className="status-overlay-frz" />}
              {cpuActive.status === 'sleep' && <div className="zzz-floating-icon">Zzz...</div>}
              {cpuActive.status === 'burn' && <div className="burn-ember-container" />}
              {cpuActive.status === 'poison' && <div className="poison-bubble-container" />}
              {cpuActive.status === 'paralysis' && <div className="paralysis-spark-container" />}
              {cpuActive.confusion && (
                <div className="confusion-dizzy-container">
                  <span className="confusion-star">💫</span>
                  <span className="confusion-star">⭐</span>
                  <span className="confusion-star">✨</span>
                </div>
              )}
              {healGlowSide === 'cpu' && <div className="heal-glow" />}
            </div>
          </div>

          {/* PLAYER BOTTOM ZONE */}
          <div className="player-zone">
            <div className="pokemon-sprite-container">
              <div
                className={`
                  ${lungeSide === 'player' ? 'lunge-player' : ''}
                  ${hurtSide === 'player' ? 'hurt-shake' : ''}
                  ${faintSide === 'player' ? 'faint-drop' : ''}
                  ${playerActive.status === 'sleep' ? 'status-overlay-slp' : ''}
                `}
              >
                <img src={playerActive.sprites.normal} alt={playerActive.name} />
              </div>

              {/* Player Status Visual Effect Overlays */}
              {playerActive.status === 'freeze' && <div className="status-overlay-frz" />}
              {playerActive.status === 'sleep' && <div className="zzz-floating-icon">Zzz...</div>}
              {playerActive.status === 'burn' && <div className="burn-ember-container" />}
              {playerActive.status === 'poison' && <div className="poison-bubble-container" />}
              {playerActive.status === 'paralysis' && <div className="paralysis-spark-container" />}
              {playerActive.confusion && (
                <div className="confusion-dizzy-container">
                  <span className="confusion-star">💫</span>
                  <span className="confusion-star">⭐</span>
                  <span className="confusion-star">✨</span>
                </div>
              )}
              {healGlowSide === 'player' && <div className="heal-glow" />}
            </div>

            <div className="pokemon-status-card">
              <div className="pokemon-status-header">
                <span>{playerActive.name}</span>
                <span>
                  {playerActive.types.map((t) => (
                    <span key={t} className={`pokemon-type-badge type-${t}`}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>

              <HpBar currentHp={playerActive.currentHp} maxHp={playerActive.maxHp} />

              {/* Player Status Badges */}
              {(playerActive.status !== 'none' || playerActive.confusion) && (
                <div className="status-badge-container">
                  {playerActive.status && playerActive.status !== 'none' && (
                    <span className={`status-badge status-${playerActive.status.slice(0, 3)}`}>
                      {playerActive.status === 'paralysis' ? 'PAR' : playerActive.status === 'poison' ? 'PSN' : playerActive.status === 'burn' ? 'BRN' : playerActive.status === 'sleep' ? 'SLP' : 'FRZ'}
                    </span>
                  )}
                  {playerActive.confusion && (
                    <span className="status-badge status-conf">
                      CONF
                    </span>
                  )}
                </div>
              )}

              {/* Player Stat Stage Badges */}
              {renderStatBadges(playerActive)}
            </div>
          </div>
        </div>

        {/* BENCH STATUS ROWS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1.5rem', backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Your Team {!canPlayerSwitch && <span style={{ fontSize: '0.7rem', color: '#f87171' }}>(Must attack once before switching!)</span>}
            </div>
            <BenchRow
              team={playerTeam}
              activeIndex={playerActiveIdx}
              align="left"
              onSelectSlot={handlePlayerSwitch}
              isInteractive={!isBusy && !winner}
              canSwitch={canPlayerSwitch}
              switchDisabledReason="Must attack at least once before switching out again!"
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Opponent Team</div>
            <BenchRow team={cpuTeam} activeIndex={cpuActiveIdx} align="right" revealedIndices={revealedCpuIndices} />
          </div>
        </div>

        {/* MOVE CONTROLS BAR WITH HOVER TOOLTIPS */}
        <div className="battle-controls" style={{ flexWrap: 'wrap' }}>
          {!hasUsableMove ? (
            <div className="move-btn-wrapper">
              <button
                className="move-btn"
                onClick={() => handleMoveSelect(-1)}
                disabled={isBusy || !!winner || playerActive.currentHp <= 0}
                style={{ maxWidth: '300px', backgroundColor: '#7f1d1d', borderColor: '#b91c1c' }}
              >
                <span className="move-btn-name" style={{ color: '#fca5a5' }}>Struggle (Recoil)</span>
                <span className="move-btn-meta">
                  <span className="pokemon-type-badge type-normal">Normal</span>
                  <span>Power: 50 (Recoil)</span>
                </span>
              </button>
              <div className="move-tooltip">
                <strong>Struggle</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8' }}>{STRUGGLE_MOVE.effect}</p>
              </div>
            </div>
          ) : (
            (playerActive.moves || []).map((move, idx) => {
              const currentPp = move.currentPp ?? move.pp;
              const maxPp = move.maxPp ?? move.pp;
              const isPpDepleted = currentPp <= 0;
              const moveAcc = getMoveAccuracy(move);
              const isOhko = isOhkoMove(move);

              return (
                <div key={move.id || idx} className="move-btn-wrapper">
                  <button
                    className="move-btn"
                    onClick={() => handleMoveSelect(idx)}
                    disabled={isBusy || !!winner || playerActive.currentHp <= 0 || isPpDepleted}
                  >
                    <span className="move-btn-name">{move.name}</span>
                    <span className="move-btn-meta">
                      <span className={`pokemon-type-badge type-${move.type}`}>{move.type}</span>
                      <span style={{ color: isPpDepleted ? '#ef4444' : '#38bdf8', fontWeight: 700 }}>
                        PP {currentPp}/{maxPp}
                      </span>
                    </span>
                  </button>

                  {/* HOVER TOOLTIP */}
                  <div className="move-tooltip">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <span>{move.name}</span>
                      <span style={{ textTransform: 'capitalize', color: '#38bdf8' }}>{move.category}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Type: <strong style={{ textTransform: 'capitalize' }}>{move.type}</strong> | Power: <strong>{isOhko ? 'OHKO' : move.power || 'Status'}</strong> | Acc: <strong>{moveAcc}%{isOhko ? ' (OHKO)' : ''}</strong> | PP: <strong>{currentPp}/{maxPp}</strong>
                    </div>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem' }}>{move.effect}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* REAL-TIME BATTLE LOG */}
        <BattleLog logs={logs} />
      </div>

      {/* DEDICATED CARD PULL REVEAL SCREEN (VICTORY) */}
      {winner === 'player' && awardedDrop && (
        <CardPullReveal
          awardedDrop={awardedDrop}
          onContinue={() => navigate('/home')}
          onPlayAgain={startNewBattle}
        />
      )}

      {/* DEFEAT MODAL BANNER */}
      {winner === 'cpu' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '90%',
              textAlign: 'center',
              padding: '2.5rem 2rem',
              border: '2px solid #ef4444',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>💀</div>
            <h2 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0', color: '#fca5a5' }}>
              DEFEAT!
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '1.05rem', margin: '0 0 1.5rem 0' }}>
              Your team was wiped out by the Opponent Trainer.
            </p>
            <button
              onClick={startNewBattle}
              style={{
                padding: '0.875rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: '#dc2626',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

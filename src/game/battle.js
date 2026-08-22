import defaultPokemonList from '../data/pokemon.json' with { type: 'json' };

export const STRUGGLE_MOVE = {
  id: 'struggle',
  name: 'Struggle',
  type: 'normal',
  power: 50,
  category: 'physical',
  pp: 99,
  maxPp: 99,
  currentPp: 99,
  effect: 'Fallback recoil attack when all moves run out of PP.',
  isStruggle: true,
};

/**
 * Type effectiveness table for starter types: grass, poison, fire, water, flying, normal, dragon, steel.
 */
export const TYPE_CHART = {
  fire: { grass: 2.0, water: 0.5, fire: 0.5, poison: 1.0, flying: 1.0, normal: 1.0, dragon: 0.5, steel: 2.0 },
  water: { fire: 2.0, grass: 0.5, water: 0.5, poison: 1.0, flying: 1.0, normal: 1.0, dragon: 0.5, steel: 1.0 },
  grass: { water: 2.0, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, normal: 1.0, dragon: 0.5, steel: 0.5 },
  poison: { grass: 2.0, poison: 0.5, fire: 1.0, water: 1.0, flying: 1.0, normal: 1.0, dragon: 1.0, steel: 0.0 },
  flying: { grass: 2.0, fire: 1.0, water: 1.0, poison: 1.0, flying: 1.0, normal: 1.0, dragon: 1.0, steel: 0.5 },
  normal: { fire: 1.0, water: 1.0, grass: 1.0, poison: 1.0, flying: 1.0, normal: 1.0, dragon: 1.0, steel: 0.5 },
  dragon: { fire: 1.0, water: 1.0, grass: 1.0, poison: 1.0, flying: 1.0, normal: 1.0, dragon: 2.0, steel: 0.5 },
  steel: { fire: 0.5, water: 0.5, grass: 1.0, poison: 1.0, flying: 1.0, normal: 1.0, dragon: 1.0, steel: 0.5 },
};

/**
 * Calculate type effectiveness multiplier.
 */
export function getTypeEffectiveness(moveType, defenderTypes) {
  if (!moveType || !defenderTypes || !Array.isArray(defenderTypes)) {
    return 1.0;
  }

  const moveChart = TYPE_CHART[moveType.toLowerCase()];
  if (!moveChart) {
    return 1.0;
  }

  return defenderTypes.reduce((multiplier, defType) => {
    const factor = moveChart[defType.toLowerCase()] ?? 1.0;
    return multiplier * factor;
  }, 1.0);
}

/**
 * Damage calculation formula.
 */
export function calculateDamage(attacker, defender, move) {
  if (!move || move.category === 'status' || move.power <= 0) {
    return {
      damage: 0,
      recoil: 0,
      effectiveness: 1.0,
      stab: false,
      isSuperEffective: false,
      isNotVeryEffective: false,
    };
  }

  let atkStat = 1;
  let defStat = 1;

  if (move.category === 'special') {
    atkStat = attacker.stats.specialAttack || 1;
    defStat = defender.stats.specialDefense || 1;
  } else {
    atkStat = attacker.stats.attack || 1;
    defStat = defender.stats.defense || 1;
  }

  const isStab = Array.isArray(attacker.types) && attacker.types.includes(move.type.toLowerCase());
  const stabMultiplier = isStab ? 1.5 : 1.0;
  const effectiveness = getTypeEffectiveness(move.type, defender.types);

  const level = 50;
  const baseDamage = Math.floor(
    (((2 * level / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2) * stabMultiplier * effectiveness
  );

  const finalDamage = Math.max(1, baseDamage);

  let recoil = 0;
  if (move.isStruggle) {
    recoil = Math.max(1, Math.floor(finalDamage * 0.25));
  }

  return {
    damage: finalDamage,
    recoil,
    effectiveness,
    stab: isStab,
    isSuperEffective: effectiveness > 1.0,
    isNotVeryEffective: effectiveness < 1.0 && effectiveness > 0,
  };
}

/**
 * Applies a status move effect and returns buff badge string if applicable.
 */
export function applyStatusMove(pokemon, move) {
  if (!move || move.category !== 'status') {
    return { type: 'none', amount: 0 };
  }

  if (move.healPercent) {
    const maxHp = pokemon.stats.hp || 100;
    const healAmount = Math.round(maxHp * move.healPercent);
    return {
      type: 'heal',
      amount: healAmount,
      target: pokemon.name,
      effectDescription: `Restores ${healAmount} HP (${Math.round(move.healPercent * 100)}% max HP)`,
    };
  }

  if (move.statBuff) {
    const statName = move.statBuff.stat;
    let badgeText = '+1 ATK';
    if (statName === 'defense') badgeText = '+1 DEF';
    else if (statName === 'speed') badgeText = '+1 SPD';
    else if (statName === 'specialAttack') badgeText = '+1 SP.ATK';
    else if (statName === 'specialDefense') badgeText = '+1 SP.DEF';

    return {
      type: 'buff',
      stat: statName,
      buffBadge: badgeText,
      multiplier: move.statBuff.multiplier,
      target: pokemon.name,
      effectDescription: `Boosts ${statName} by ${Math.round((move.statBuff.multiplier - 1) * 100)}%`,
    };
  }

  return {
    type: 'status',
    target: pokemon.name,
    effectDescription: move.effect || 'Status effect applied.',
  };
}

/**
 * CPU AI: Determines if CPU should switch Pokémon mid-battle.
 * Lowered switch probability to 10% (easy-to-medium level).
 */
export function shouldCpuSwitch(cpuTeam, cpuIdx, playerPokemon) {
  if (!cpuTeam || !Array.isArray(cpuTeam) || !playerPokemon) return null;

  const cpuActive = cpuTeam[cpuIdx];
  if (!cpuActive || cpuActive.currentHp <= 0) return null;

  const hpRatio = cpuActive.currentHp / cpuActive.maxHp;

  // Only switch if HP < 15% (very desperate)
  if (hpRatio >= 0.15) {
    return null;
  }

  const candidates = [];
  cpuTeam.forEach((candidate, idx) => {
    if (idx !== cpuIdx && candidate.currentHp > 0) {
      candidates.push(idx);
    }
  });

  if (candidates.length === 0) return null;

  // 10% chance to switch
  if (Math.random() < 0.10) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return null;
}

/**
 * Easy/Medium Level CPU Move Selection AI:
 * - 65% chance to pick a random usable move.
 * - 35% chance to seek super-effective moves.
 */
export function selectCpuMove(cpuPokemon, playerPokemon) {
  const moves = cpuPokemon.moves || [];
  const usableMoves = moves.filter((m) => (m.currentPp ?? m.pp) > 0);

  if (usableMoves.length === 0) {
    return { moveIdx: -1, move: STRUGGLE_MOVE };
  }

  // Easy/Medium IQ: 65% random move selection
  if (Math.random() < 0.65) {
    const chosenMove = usableMoves[Math.floor(Math.random() * usableMoves.length)];
    const moveIdx = moves.findIndex((m) => m.id === chosenMove.id);
    return { moveIdx, move: chosenMove };
  }

  // 35% chance to seek super-effective move or heal
  const hpRatio = (cpuPokemon.currentHp ?? cpuPokemon.stats.hp) / cpuPokemon.stats.hp;
  if (hpRatio < 0.35) {
    const healMove = usableMoves.find((m) => m.category === 'status' && m.healPercent);
    if (healMove) {
      const moveIdx = moves.findIndex((m) => m.id === healMove.id);
      return { moveIdx, move: healMove };
    }
  }

  const superEffectiveMove = usableMoves.find((m) => m.power > 0 && getTypeEffectiveness(m.type, playerPokemon.types) > 1.0);
  if (superEffectiveMove) {
    const moveIdx = moves.findIndex((m) => m.id === superEffectiveMove.id);
    return { moveIdx, move: superEffectiveMove };
  }

  const chosenMove = usableMoves[Math.floor(Math.random() * usableMoves.length)];
  const moveIdx = moves.findIndex((m) => m.id === chosenMove.id);
  return { moveIdx, move: chosenMove };
}

/**
 * Generates a random team of 6 final-evolution Pokémon initialized with currentHp and currentPp per move.
 */
export function generateRandomTeam(customList = null, count = 6) {
  const baseList = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;
  
  // Filter candidate pool to only final-evolution Pokemon
  const finalEvoList = baseList.filter((pkmn) => pkmn.isFinalEvolution);
  const list = finalEvoList.length > 0 ? finalEvoList : baseList;

  const team = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * list.length);
    const template = list[randomIndex];
    
    const moves = (template.moves || []).map((m) => ({
      ...m,
      currentPp: m.pp || 10,
      maxPp: m.pp || 10,
    }));

    team.push({
      ...JSON.parse(JSON.stringify(template)),
      moves,
      instanceId: `pkmn_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      currentHp: template.stats.hp,
      maxHp: template.stats.hp,
      isFainted: false,
    });
  }
  return team;
}

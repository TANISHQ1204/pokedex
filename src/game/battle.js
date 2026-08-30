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
 * Complete 18x18 Type effectiveness table (Gen 6+ rules, including Fairy type).
 * Maps attacking type -> defending type -> multiplier.
 * Any unlisted defending type defaults to 1.0 (normal effectiveness).
 */
export const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0.0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2.0, ice: 2.0, bug: 2.0, rock: 0.5, dragon: 0.5, steel: 2.0 },
  water: { fire: 2.0, water: 0.5, grass: 0.5, ground: 2.0, rock: 2.0, dragon: 0.5 },
  grass: { fire: 0.5, water: 2.0, grass: 0.5, poison: 0.5, ground: 2.0, flying: 0.5, bug: 0.5, rock: 2.0, dragon: 0.5, steel: 0.5 },
  electric: { water: 2.0, grass: 0.5, electric: 0.5, ground: 0.0, flying: 2.0, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2.0, ice: 0.5, ground: 2.0, flying: 2.0, dragon: 2.0, steel: 0.5 },
  fighting: { normal: 2.0, ice: 2.0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2.0, ghost: 0.0, dark: 2.0, steel: 2.0, fairy: 0.5 },
  poison: { grass: 2.0, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0.0, fairy: 2.0 },
  ground: { fire: 2.0, electric: 2.0, grass: 0.5, poison: 2.0, flying: 0.0, bug: 0.5, rock: 2.0, steel: 2.0 },
  flying: { grass: 2.0, electric: 0.5, fighting: 2.0, bug: 2.0, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2.0, poison: 2.0, psychic: 0.5, dark: 0.0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2.0, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2.0, ghost: 0.5, dark: 2.0, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2.0, ice: 2.0, fighting: 0.5, ground: 0.5, flying: 2.0, bug: 2.0, steel: 0.5 },
  ghost: { normal: 0.0, psychic: 2.0, ghost: 2.0, dark: 0.5 },
  dragon: { dragon: 2.0, steel: 0.5, fairy: 0.0 },
  dark: { fighting: 0.5, psychic: 2.0, ghost: 2.0, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2.0, rock: 2.0, steel: 0.5, fairy: 2.0 },
  fairy: { fire: 0.5, fighting: 2.0, poison: 0.5, dragon: 2.0, dark: 2.0, steel: 0.5 },
};

/**
 * Calculate type effectiveness multiplier.
 * Correctly multiplies effectiveness across single or dual-type defenders.
 */
export function getTypeEffectiveness(moveType, defenderTypes) {
  if (!moveType || !defenderTypes) {
    return 1.0;
  }

  const types = Array.isArray(defenderTypes) ? defenderTypes : [defenderTypes];
  if (types.length === 0) {
    return 1.0;
  }

  const moveChart = TYPE_CHART[moveType.toLowerCase()];
  if (!moveChart) {
    return 1.0;
  }

  return types.reduce((multiplier, defType) => {
    if (!defType || typeof defType !== 'string') return multiplier;
    const factor = moveChart[defType.toLowerCase()] ?? 1.0;
    return multiplier * factor;
  }, 1.0);
}



/**
 * Standard Pokémon Stat Stage Multipliers (-6 to +6 scale).
 * For Combat Stats (Attack, Defense, Special Attack, Special Defense, Speed):
 *   Stage +6: 4.0x, +5: 3.5x, +4: 3.0x, +3: 2.5x, +2: 2.0x, +1: 1.5x, 0: 1.0x
 *   Stage -1: 0.667x, -2: 0.50x, -3: 0.40x, -4: 0.333x, -5: 0.286x, -6: 0.25x
 */
export function getStatStageMultiplier(stage = 0) {
  const s = Math.max(-6, Math.min(6, Math.round(stage || 0)));
  if (s >= 0) {
    return (2 + s) / 2;
  } else {
    return 2 / (2 + Math.abs(s));
  }
}

/**
 * Stage Multipliers for Accuracy & Evasion (-6 to +6 scale).
 */
export function getAccuracyStageMultiplier(stage = 0) {
  const s = Math.max(-6, Math.min(6, Math.round(stage || 0)));
  if (s >= 0) {
    return (3 + s) / 3;
  } else {
    return 3 / (3 + Math.abs(s));
  }
}

/**
 * Standard Pokémon Move Stat Change database mapping.
 * Specifies target ('self' | 'opponent'), stat name, and stage modification delta (+1, +2, -1, -2, etc.).
 */
export const MOVE_STAT_CHANGE_MAP = {
  // Attack Boosts (Self)
  swords_dance: { target: 'self', stat: 'attack', stages: 2 },
  howl: { target: 'self', stat: 'attack', stages: 1 },
  meditate: { target: 'self', stat: 'attack', stages: 1 },
  sharpen: { target: 'self', stat: 'attack', stages: 1 },
  bulk_up: [
    { target: 'self', stat: 'attack', stages: 1 },
    { target: 'self', stat: 'defense', stages: 1 },
  ],
  dragon_dance: [
    { target: 'self', stat: 'attack', stages: 1 },
    { target: 'self', stat: 'speed', stages: 1 },
  ],

  // Attack Debuffs (Opponent)
  growl: { target: 'opponent', stat: 'attack', stages: -1 },
  charm: { target: 'opponent', stat: 'attack', stages: -2 },
  feather_dance: { target: 'opponent', stat: 'attack', stages: -2 },
  tickle: [
    { target: 'opponent', stat: 'attack', stages: -1 },
    { target: 'opponent', stat: 'defense', stages: -1 },
  ],
  play_nice: { target: 'opponent', stat: 'attack', stages: -1 },
  baby_doll_eyes: { target: 'opponent', stat: 'attack', stages: -1 },

  // Defense Boosts (Self)
  harden: { target: 'self', stat: 'defense', stages: 1 },
  defense_curl: { target: 'self', stat: 'defense', stages: 1 },
  withdraw: { target: 'self', stat: 'defense', stages: 1 },
  iron_defense: { target: 'self', stat: 'defense', stages: 2 },
  acid_armor: { target: 'self', stat: 'defense', stages: 2 },
  barrier: { target: 'self', stat: 'defense', stages: 2 },
  cotton_guard: { target: 'self', stat: 'defense', stages: 3 },
  shelter: { target: 'self', stat: 'defense', stages: 2 },

  // Defense Debuffs (Opponent)
  tail_whip: { target: 'opponent', stat: 'defense', stages: -1 },
  leer: { target: 'opponent', stat: 'defense', stages: -1 },
  screech: { target: 'opponent', stat: 'defense', stages: -2 },

  // Special Attack Boosts (Self)
  growth: [
    { target: 'self', stat: 'attack', stages: 1 },
    { target: 'self', stat: 'specialAttack', stages: 1 },
  ],
  nasty_plot: { target: 'self', stat: 'specialAttack', stages: 2 },
  tail_glow: { target: 'self', stat: 'specialAttack', stages: 3 },
  calm_mind: [
    { target: 'self', stat: 'specialAttack', stages: 1 },
    { target: 'self', stat: 'specialDefense', stages: 1 },
  ],
  quiver_dance: [
    { target: 'self', stat: 'specialAttack', stages: 1 },
    { target: 'self', stat: 'specialDefense', stages: 1 },
    { target: 'self', stat: 'speed', stages: 1 },
  ],
  geomancy: [
    { target: 'self', stat: 'specialAttack', stages: 2 },
    { target: 'self', stat: 'specialDefense', stages: 2 },
    { target: 'self', stat: 'speed', stages: 2 },
  ],

  // Special Defense Boosts (Self)
  amnesia: { target: 'self', stat: 'specialDefense', stages: 2 },
  charge: { target: 'self', stat: 'specialDefense', stages: 1 },

  // Special Defense Debuffs (Opponent)
  fake_tears: { target: 'opponent', stat: 'specialDefense', stages: -2 },
  metal_sound: { target: 'opponent', stat: 'specialDefense', stages: -2 },
  captivate: { target: 'opponent', stat: 'specialAttack', stages: -2 },
  confide: { target: 'opponent', stat: 'specialAttack', stages: -1 },
  eerie_impulse: { target: 'opponent', stat: 'specialAttack', stages: -2 },

  // Speed Boosts (Self)
  agility: { target: 'self', stat: 'speed', stages: 2 },
  rock_polish: { target: 'self', stat: 'speed', stages: 2 },
  autotomize: { target: 'self', stat: 'speed', stages: 2 },
  tailwind: { target: 'self', stat: 'speed', stages: 2 },

  // Speed Debuffs (Opponent)
  scary_face: { target: 'opponent', stat: 'speed', stages: -2 },
  string_shot: { target: 'opponent', stat: 'speed', stages: -2 },
  cotton_spore: { target: 'opponent', stat: 'speed', stages: -2 },

  // Accuracy / Evasion
  sand_attack: { target: 'opponent', stat: 'accuracy', stages: -1 },
  smokescreen: { target: 'opponent', stat: 'accuracy', stages: -1 },
  flash: { target: 'opponent', stat: 'accuracy', stages: -1 },
  kinesis: { target: 'opponent', stat: 'accuracy', stages: -1 },
  double_team: { target: 'self', stat: 'evasion', stages: 1 },
  minimize: { target: 'self', stat: 'evasion', stages: 2 },

  // Omniboost Moves
  ancient_power: [
    { target: 'self', stat: 'attack', stages: 1 },
    { target: 'self', stat: 'defense', stages: 1 },
    { target: 'self', stat: 'specialAttack', stages: 1 },
    { target: 'self', stat: 'specialDefense', stages: 1 },
    { target: 'self', stat: 'speed', stages: 1 },
  ],
  ominous_wind: [
    { target: 'self', stat: 'attack', stages: 1 },
    { target: 'self', stat: 'defense', stages: 1 },
    { target: 'self', stat: 'specialAttack', stages: 1 },
    { target: 'self', stat: 'specialDefense', stages: 1 },
    { target: 'self', stat: 'speed', stages: 1 },
  ],
  silver_wind: [
    { target: 'self', stat: 'attack', stages: 1 },
    { target: 'self', stat: 'defense', stages: 1 },
    { target: 'self', stat: 'specialAttack', stages: 1 },
    { target: 'self', stat: 'specialDefense', stages: 1 },
    { target: 'self', stat: 'speed', stages: 1 },
  ],
};

/**
 * Resolves stat change requirements for a move.
 */
export function getMoveStatChanges(move) {
  if (!move) return [];

  // 1. Check explicit statChange property on move object (highest priority)
  if (move.statChange) {
    return Array.isArray(move.statChange) ? move.statChange : [move.statChange];
  }

  // 2. Check MOVE_STAT_CHANGE_MAP by move id — authoritative source for all known
  //    stat-changing moves. Must be checked BEFORE statBuff because statBuff objects
  //    in pokemon.json use a legacy { stat, multiplier } shape (not { stat, stages }),
  //    so reading statBuff.stages is always undefined.
  const moveId = move.id?.toLowerCase().replace(/-/g, '_');
  const mapped = MOVE_STAT_CHANGE_MAP[moveId];
  if (mapped) {
    return Array.isArray(mapped) ? mapped : [mapped];
  }

  // 3. Legacy statBuff fallback — for any move not yet in MOVE_STAT_CHANGE_MAP
  //    that still carries a statBuff field. Uses stat from statBuff, defaults
  //    stages to +1 since the JSON only stores a multiplier (not a stage delta).
  if (move.statBuff) {
    const target = move.statBuff.target || 'self';
    const stat = move.statBuff.stat || 'specialAttack';
    const stages = move.statBuff.stages ?? 1; // statBuff.multiplier is vestigial
    return [{ target, stat, stages }];
  }

  // 4. Text-parsing fallback on move effect description (last resort)
  const text = `${move.id} ${move.name} ${move.effect || ''}`.toLowerCase();
  const isOpponent = text.includes('target') || text.includes('foe') || text.includes('opponent');
  const target = isOpponent ? 'opponent' : 'self';

  let stages = 1;
  if (text.includes('sharply') || text.includes('2 stages') || text.includes('harshly')) {
    stages = 2;
  } else if (text.includes('drastically') || text.includes('3 stages') || text.includes('severely')) {
    stages = 3;
  }

  const isLower = text.includes('lower') || text.includes('decrease') || text.includes('fell') || text.includes('reduce');
  if (isLower) stages = -stages;

  const changes = [];
  if (text.includes('attack') && !text.includes('special attack')) {
    changes.push({ target, stat: 'attack', stages });
  }
  if (text.includes('defense') && !text.includes('special defense')) {
    changes.push({ target, stat: 'defense', stages });
  }
  if (text.includes('special attack') || text.includes('sp. atk')) {
    changes.push({ target, stat: 'specialAttack', stages });
  }
  if (text.includes('special defense') || text.includes('sp. def')) {
    changes.push({ target, stat: 'specialDefense', stages });
  }
  if (text.includes('speed')) {
    changes.push({ target, stat: 'speed', stages });
  }

  return changes;
}

/**
 * Applies a stat stage modification (-6 to +6) to a target Pokémon.
 * Clamps to -6/+6 cap and generates authentic battle log narration.
 */
export function applyStatChange(targetPokemon, statName, stageDelta) {
  if (!targetPokemon || !statName || !stageDelta) {
    return { success: false, reason: 'invalid' };
  }

  if (!targetPokemon.statStages) {
    targetPokemon.statStages = {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
    };
  }

  const STAT_DISPLAY_NAMES = {
    attack: 'Attack',
    defense: 'Defense',
    specialAttack: 'Sp. Atk',
    specialDefense: 'Sp. Def',
    speed: 'Speed',
    accuracy: 'Accuracy',
    evasion: 'Evasion',
  };

  const statLabel = STAT_DISPLAY_NAMES[statName] || statName;
  const currentStage = targetPokemon.statStages[statName] || 0;
  const targetName = targetPokemon.name.toUpperCase();

  const newStage = Math.max(-6, Math.min(6, currentStage + stageDelta));
  const actualChange = newStage - currentStage;

  if (actualChange === 0) {
    let capMsg = `${targetName}'s ${statLabel} won't go any higher!`;
    if (stageDelta < 0) {
      capMsg = `${targetName}'s ${statLabel} won't go any lower!`;
    }
    return {
      success: false,
      reason: 'capped',
      statName,
      currentStage,
      newStage: currentStage,
      message: capMsg,
    };
  }

  targetPokemon.statStages[statName] = newStage;

  let msg = '';
  if (actualChange === 1) {
    msg = `${targetName}'s ${statLabel} rose!`;
  } else if (actualChange === 2) {
    msg = `${targetName}'s ${statLabel} rose sharply!`;
  } else if (actualChange >= 3) {
    msg = `${targetName}'s ${statLabel} rose drastically!`;
  } else if (actualChange === -1) {
    msg = `${targetName}'s ${statLabel} fell!`;
  } else if (actualChange === -2) {
    msg = `${targetName}'s ${statLabel} harshly fell!`;
  } else {
    msg = `${targetName}'s ${statLabel} severely fell!`;
  }

  return {
    success: true,
    statName,
    oldStage: currentStage,
    newStage,
    stageChange: actualChange,
    message: msg,
  };
}

/**
 * Applies a status move effect and returns buff/heal/status result object.
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

  const statChanges = getMoveStatChanges(move);
  if (statChanges.length > 0) {
    return {
      type: 'statChange',
      changes: statChanges,
      target: pokemon.name,
      effectDescription: move.effect || 'Stat stage modified.',
    };
  }

  return {
    type: 'status',
    target: pokemon.name,
    effectDescription: move.effect || 'Status effect applied.',
  };
}

/**
 * Move status effect metadata mapping.
 */
export const MOVE_STATUS_MAP = {
  // Pure Status Moves
  thunder_wave: { condition: 'paralysis', chance: 1.0, accuracy: 0.90 },
  will_o_wisp: { condition: 'burn', chance: 1.0, accuracy: 0.85 },
  toxic: { condition: 'poison', chance: 1.0, accuracy: 0.90 },
  poison_powder: { condition: 'poison', chance: 1.0, accuracy: 0.75 },
  poison_gas: { condition: 'poison', chance: 1.0, accuracy: 0.90 },
  sleep_powder: { condition: 'sleep', chance: 1.0, accuracy: 0.75 },
  hypnosis: { condition: 'sleep', chance: 1.0, accuracy: 0.60 },
  sing: { condition: 'sleep', chance: 1.0, accuracy: 0.55 },
  spore: { condition: 'sleep', chance: 1.0, accuracy: 1.00 },
  confuse_ray: { condition: 'confusion', chance: 1.0, accuracy: 1.00 },
  supersonic: { condition: 'confusion', chance: 1.0, accuracy: 0.55 },
  stun_spore: { condition: 'paralysis', chance: 1.0, accuracy: 0.75 },
  glare: { condition: 'paralysis', chance: 1.0, accuracy: 1.00 },

  // Damaging Moves with Secondary Effects
  thunderbolt: { condition: 'paralysis', chance: 0.10, accuracy: 1.0 },
  thunder: { condition: 'paralysis', chance: 0.30, accuracy: 0.70 },
  discharge: { condition: 'paralysis', chance: 0.30, accuracy: 1.0 },
  spark: { condition: 'paralysis', chance: 0.30, accuracy: 1.0 },
  body_slam: { condition: 'paralysis', chance: 0.30, accuracy: 1.0 },

  flamethrower: { condition: 'burn', chance: 0.10, accuracy: 1.0 },
  fire_blast: { condition: 'burn', chance: 0.10, accuracy: 0.85 },
  scald: { condition: 'burn', chance: 0.30, accuracy: 1.0 },
  heat_wave: { condition: 'burn', chance: 0.10, accuracy: 0.90 },
  lava_plume: { condition: 'burn', chance: 0.30, accuracy: 1.0 },

  ice_beam: { condition: 'freeze', chance: 0.10, accuracy: 1.0 },
  blizzard: { condition: 'freeze', chance: 0.10, accuracy: 0.70 },
  ice_punch: { condition: 'freeze', chance: 0.10, accuracy: 1.0 },

  sludge_bomb: { condition: 'poison', chance: 0.30, accuracy: 1.0 },
  poison_jab: { condition: 'poison', chance: 0.30, accuracy: 1.0 },
  sludge_wave: { condition: 'poison', chance: 0.10, accuracy: 1.0 },

  water_pulse: { condition: 'confusion', chance: 0.20, accuracy: 1.0 },
  confusion: { condition: 'confusion', chance: 0.10, accuracy: 1.0 },
  psybeam: { condition: 'confusion', chance: 0.10, accuracy: 1.0 },
  hurricane: { condition: 'confusion', chance: 0.30, accuracy: 0.70 },
};

/**
 * One-Hit KO (OHKO) moves set.
 */
export const OHKO_MOVES = new Set(['fissure', 'guillotine', 'horn_drill', 'sheer_cold']);

/**
 * Move accuracy mapping (0 - 100 percentage scale).
 * Unlisted moves default to 100%.
 */
export const MOVE_ACCURACY_MAP = {
  // OHKO Moves (Flat 30% accuracy)
  fissure: 30,
  guillotine: 30,
  horn_drill: 30,
  sheer_cold: 30,

  // Lower Accuracy Moves
  thunder: 70,
  blizzard: 70,
  focus_blast: 70,
  hurricane: 70,
  iron_tail: 75,
  hypnosis: 60,
  sing: 55,
  supersonic: 55,
  sleep_powder: 75,
  poison_powder: 75,
  stun_spore: 75,
  hydro_pump: 80,
  stone_edge: 80,
  will_o_wisp: 85,
  fire_blast: 85,
  megahorn: 85,
  toxic: 90,
  thunder_wave: 90,
  play_rough: 90,
  heat_wave: 90,
  rock_slide: 90,
  air_slash: 95,
};

/**
 * Checks if a move is a One-Hit KO move.
 */
export function isOhkoMove(move) {
  if (!move || !move.id) return false;
  const id = move.id.toLowerCase();
  return OHKO_MOVES.has(id) || (move.effect && move.effect.toLowerCase().includes('one-hit ko'));
}

/**
 * Gets accuracy value (0 - 100) for a given move.
 */
export function getMoveAccuracy(move) {
  if (!move) return 100;
  if (typeof move.accuracy === 'number') return move.accuracy;
  if (isOhkoMove(move)) return 30;

  const mapped = MOVE_ACCURACY_MAP[move.id?.toLowerCase()];
  if (typeof mapped === 'number') return mapped;

  return 100;
}

/**
 * Resolves the status effect configuration for a move.
 */
export function getMoveStatusEffect(move) {
  if (!move) return null;

  if (move.statusEffect) {
    return move.statusEffect;
  }

  const mapped = MOVE_STATUS_MAP[move.id];
  if (mapped) return mapped;

  // Infer from move effect description or name if unmapped
  const text = `${move.id} ${move.name} ${move.effect || ''}`.toLowerCase();
  if (text.includes('paralyz') || text.includes('paralys')) {
    return { condition: 'paralysis', chance: move.category === 'status' ? 1.0 : 0.10, accuracy: 1.0 };
  }
  if (text.includes('burn')) {
    return { condition: 'burn', chance: move.category === 'status' ? 1.0 : 0.10, accuracy: 1.0 };
  }
  if (text.includes('poison')) {
    return { condition: 'poison', chance: move.category === 'status' ? 1.0 : 0.30, accuracy: 1.0 };
  }
  if (text.includes('sleep') || text.includes('asleep')) {
    return { condition: 'sleep', chance: 1.0, accuracy: 0.75 };
  }
  if (text.includes('frozen') || text.includes('freeze')) {
    return { condition: 'freeze', chance: move.category === 'status' ? 1.0 : 0.10, accuracy: 1.0 };
  }
  if (text.includes('confus')) {
    return { condition: 'confusion', chance: move.category === 'status' ? 1.0 : 0.20, accuracy: 1.0 };
  }

  return null;
}

/**
 * Attempts to apply a status condition to a target Pokémon.
 * Enforces type immunities, accuracy checks, infliction chance, and status mutual exclusivity.
 */
export function applyStatusCondition(target, condition, moveAccuracy = 1.0, inflictionChance = 1.0) {
  if (!target || !condition || condition === 'none') {
    return { success: false, reason: 'none' };
  }

  const targetName = target.name.toUpperCase();
  const types = Array.isArray(target.types) ? target.types.map((t) => t.toLowerCase()) : [];

  // 1. Check Type Immunities
  if (condition === 'poison' && (types.includes('poison') || types.includes('steel'))) {
    return { success: false, reason: 'immune', message: `${targetName} is immune to poison!` };
  }
  if (condition === 'burn' && types.includes('fire')) {
    return { success: false, reason: 'immune', message: `${targetName} is immune to burn!` };
  }
  if (condition === 'paralysis' && types.includes('electric')) {
    return { success: false, reason: 'immune', message: `${targetName} is immune to paralysis!` };
  }
  if (condition === 'freeze' && types.includes('ice')) {
    return { success: false, reason: 'immune', message: `${targetName} is immune to freezing!` };
  }

  // 2. Accuracy & Infliction Chance Rolls
  if (Math.random() > moveAccuracy) {
    return { success: false, reason: 'miss', message: `The attack missed!` };
  }
  if (Math.random() > inflictionChance) {
    return { success: false, reason: 'chance_failed' };
  }

  // 3. Status Application & Exclusivity Checks
  if (condition === 'confusion') {
    if (target.confusion) {
      return { success: false, reason: 'already_confused', message: `${targetName} is already confused!` };
    }
    target.confusion = true;
    target.confusionTurns = Math.floor(Math.random() * 4) + 1; // 1 to 4 turns
    return { success: true, condition: 'confusion', message: `${targetName} became confused!` };
  }

  // Non-volatile statuses are mutually exclusive
  if (target.status && target.status !== 'none') {
    return { success: false, reason: 'already_statused', message: `${targetName} is already ${target.status}ed!` };
  }

  target.status = condition;
  if (condition === 'sleep') {
    target.sleepTurns = Math.floor(Math.random() * 3) + 1; // 1 to 3 turns
    return { success: true, condition: 'sleep', message: `${targetName} fell asleep!` };
  }
  if (condition === 'burn') {
    return { success: true, condition: 'burn', message: `${targetName} was burned!` };
  }
  if (condition === 'poison') {
    return { success: true, condition: 'poison', message: `${targetName} was poisoned!` };
  }
  if (condition === 'paralysis') {
    return { success: true, condition: 'paralysis', message: `${targetName} is paralyzed! It may be unable to move!` };
  }
  if (condition === 'freeze') {
    return { success: true, condition: 'freeze', message: `${targetName} was frozen solid!` };
  }

  return { success: true, condition };
}

/**
 * Performs turn-start status checks for an active combatant before move execution.
 * Handles Sleep, Freeze, Paralysis, and Confusion self-hit logic.
 */
export function checkTurnStartStatus(pokemon, move = null) {
  if (!pokemon) return { cantMove: false, logs: [] };

  const logs = [];
  const name = pokemon.name.toUpperCase();

  // 1. Sleep Check
  if (pokemon.status === 'sleep') {
    pokemon.sleepTurns = (pokemon.sleepTurns ?? 1) - 1;
    if (pokemon.sleepTurns <= 0) {
      pokemon.status = 'none';
      pokemon.sleepTurns = 0;
      logs.push({ text: `${name} woke up!` });
    } else {
      logs.push({ text: `${name} is fast asleep!` });
      return { cantMove: true, logs };
    }
  }

  // 2. Freeze Check
  if (pokemon.status === 'freeze') {
    const isFireMove = move && move.type && move.type.toLowerCase() === 'fire';
    if (isFireMove || Math.random() < 0.20) {
      pokemon.status = 'none';
      logs.push({ text: `${name} thawed out!` });
    } else {
      logs.push({ text: `${name} is frozen solid!` });
      return { cantMove: true, logs };
    }
  }

  // 3. Paralysis Check
  if (pokemon.status === 'paralysis') {
    if (Math.random() < 0.25) {
      logs.push({ text: `${name} is paralyzed and can't move!`, isFaint: true });
      return { cantMove: true, logs };
    }
  }

  // 4. Confusion Check (can stack with non-volatile status)
  if (pokemon.confusion) {
    pokemon.confusionTurns = (pokemon.confusionTurns ?? 1) - 1;
    if (pokemon.confusionTurns <= 0) {
      pokemon.confusion = false;
      pokemon.confusionTurns = 0;
      logs.push({ text: `${name} snapped out of confusion!` });
    } else {
      logs.push({ text: `${name} is confused!` });
      if (Math.random() < 0.33) {
        // Confusion self-hit (40 power physical hit)
        const atk = pokemon.stats.attack || 1;
        const def = pokemon.stats.defense || 1;
        const burnMult = pokemon.status === 'burn' ? 0.5 : 1.0;
        const baseDamage = Math.floor((((2 * 50 / 5 + 2) * 40 * (atk / def)) / 50 + 2) * burnMult);
        const selfDamage = Math.max(1, baseDamage);

        pokemon.currentHp = Math.max(0, pokemon.currentHp - selfDamage);
        if (pokemon.currentHp <= 0) {
          pokemon.isFainted = true;
        }

        logs.push({ text: `${name} hurt itself in its confusion! (Dealt ${selfDamage} damage)`, isFaint: true });
        return { cantMove: true, hurtSelf: true, selfDamage, logs };
      }
    }
  }

  return { cantMove: false, logs };
}

/**
 * Applies end-of-turn status ticks (Poison & Burn damage).
 */
export function applyEndOfTurnStatus(pokemon) {
  if (!pokemon || pokemon.currentHp <= 0) return [];

  const logs = [];
  const name = pokemon.name.toUpperCase();
  const maxHp = pokemon.stats.hp || 100;

  // Poison damage (1/8 max HP)
  if (pokemon.status === 'poison') {
    const damage = Math.max(1, Math.floor(maxHp / 8));
    pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
    if (pokemon.currentHp <= 0) {
      pokemon.isFainted = true;
    }
    logs.push({ text: `${name} is hurt by poison! (Dealt ${damage} damage)`, isFaint: true });
  }

  // Burn damage (1/16 max HP)
  if (pokemon.status === 'burn' && pokemon.currentHp > 0) {
    const damage = Math.max(1, Math.floor(maxHp / 16));
    pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
    if (pokemon.currentHp <= 0) {
      pokemon.isFainted = true;
    }
    logs.push({ text: `${name} is hurt by its burn! (Dealt ${damage} damage)`, isFaint: true });
  }

  return logs;
}

/**
 * Gets effective speed of a Pokémon, taking stat stages and Paralysis speed penalty into account.
 */
export function getEffectiveSpeed(pokemon) {
  if (!pokemon || !pokemon.stats) return 1;
  const baseSpeed = pokemon.stats.speed || 1;
  const speedStage = pokemon.statStages?.speed || 0;
  const stagedSpeed = Math.floor(baseSpeed * getStatStageMultiplier(speedStage));
  return pokemon.status === 'paralysis' ? Math.floor(stagedSpeed * 0.5) : stagedSpeed;
}

/**
 * Damage calculation formula.
 * Applies stat stage multipliers and Burn physical attack halving.
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
    const baseAtk = attacker.stats.specialAttack || 1;
    const baseDef = defender.stats.specialDefense || 1;
    const atkStage = attacker.statStages?.specialAttack || 0;
    const defStage = defender.statStages?.specialDefense || 0;
    atkStat = Math.floor(baseAtk * getStatStageMultiplier(atkStage));
    defStat = Math.floor(baseDef * getStatStageMultiplier(defStage));
  } else {
    const baseAtk = attacker.stats.attack || 1;
    const baseDef = defender.stats.defense || 1;
    const atkStage = attacker.statStages?.attack || 0;
    const defStage = defender.statStages?.defense || 0;
    atkStat = Math.floor(baseAtk * getStatStageMultiplier(atkStage));
    defStat = Math.floor(baseDef * getStatStageMultiplier(defStage));

    // Burn halves physical attack power
    if (attacker.status === 'burn') {
      atkStat = Math.floor(atkStat * 0.5);
    }
  }

  // Floor to at least 1
  atkStat = Math.max(1, atkStat);
  defStat = Math.max(1, defStat);

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

// The chance a single battle-team slot rolls as the SHINY variant of whatever
// Pokemon was selected. This is a purely battle-time random roll (~2.5%) that is
// fully independent of any player's collection / shiny ownership — it applies
// symmetrically to both sides and is discarded once the battle ends.
export const SHINY_BATTLE_CHANCE = 0.025;

// Stat multiplier applied to a battle Pokemon whose slot rolled shiny, for that
// battle instance only (no effect on collection or any persisted data).
export const SHINY_STAT_BOOST = 1.12;

/**
 * Applies the battle-time shiny stat boost (12%) to a base stats object,
 * returning a new rounded-up stats object.
 */
export function applyShinyStatBoost(baseStats = {}) {
  const boost = SHINY_STAT_BOOST;
  const statKeys = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  const stats = { ...baseStats };
  statKeys.forEach((key) => {
    if (typeof stats[key] === 'number') {
      stats[key] = Math.max(1, Math.round(stats[key] * boost));
    }
  });
  return stats;
}

/**
 * Generates a random battle team of `count` Pokémon (any evolution stage is
 * eligible) with currentHp, currentPp, and status condition states initialized.
 *
 * Shiny rolling: each slot independently has a ~2.5% chance (SHINY_BATTLE_CHANCE)
 * of being the SHINY variant of the selected Pokemon. This is a pure random
 * battle-time roll with NO connection to collection ownership. A shiny slot
 * receives a 12% stat boost (SHINY_STAT_BOOST) for this battle only and is
 * flagged with isShiny = true so the UI can show the shiny sprite + indicator.
 */
export function generateRandomTeam(customList = null, count = 6) {
  const baseList = customList && Array.isArray(customList) && customList.length > 0 ? customList : defaultPokemonList;

  // ALL Pokemon are eligible regardless of evolution stage (no final-evo filter).
  const pool = baseList.length > 0 ? baseList : defaultPokemonList;

  // Fisher-Yates partial shuffle: pick `count` unique Pokemon uniformly at random
  const picks = Math.min(count, pool.length);
  const shuffled = pool.slice();
  for (let i = 0; i < picks; i++) {
    const j = i + Math.floor(Math.random() * (shuffled.length - i));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const team = [];
  for (let i = 0; i < picks; i++) {
    const template = shuffled[i];

    // Independent shiny roll per slot (~2.5%). Purely battle-time; no ownership
    // check anywhere.
    const isShiny = Math.random() < SHINY_BATTLE_CHANCE;

    // Apply the 12% stat boost for shiny slots for this battle instance only.
    const stats = isShiny ? applyShinyStatBoost(template.stats) : template.stats;
    const maxHp = stats.hp;

    const moves = (template.moves || []).map((m) => ({
      ...m,
      currentPp: m.pp || 10,
      maxPp: m.pp || 10,
    }));

    team.push({
      ...JSON.parse(JSON.stringify(template)),
      moves,
      isShiny,
      statBoost: isShiny ? SHINY_STAT_BOOST : 1.0,
      stats,
      instanceId: `pkmn_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      currentHp: maxHp,
      maxHp,
      isFainted: false,
      status: 'none',
      sleepTurns: 0,
      confusion: false,
      confusionTurns: 0,
      statStages: {
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0,
      },
    });
  }
  return team;
}

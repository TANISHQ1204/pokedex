import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  computeBattleRecord,
  computeBattlesPerDay,
  computeMostFoughtOpponents,
  findFastestWin,
  summarizePulls,
  formatTimeAgo,
  formatDate,
} from '../utils/stats';

export {
  computeBattleRecord,
  computeBattlesPerDay,
  computeMostFoughtOpponents,
  findFastestWin,
  summarizePulls,
  formatTimeAgo,
  formatDate,
};

const BATTLE_HISTORY_KEY = 'pokedex_battle_history_store';
const CARD_PULLS_KEY = 'pokedex_card_pulls_store';

function isConfigured() {
  return isSupabaseConfigured();
}

function readLocalStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function writeLocalStore(key, rows) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch (_) {
    /* quota exceeded or private mode — ignore */
  }
}

function fakeId() {
  return `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Append a completed battle to the user's battle history.
 * Fire-and-forget (never throws) so battle flow is never blocked by stats logging.
 */
export async function recordBattleResult({
  userId,
  result,
  mode = 'solo',
  opponentType = 'cpu',
  opponentId = null,
  opponentName = null,
  opponentTeam = [],
  playerTeam = [],
  turns = 0,
} = {}) {
  if (!userId) return;

  const payload = {
    user_id: userId,
    result,
    mode,
    opponent_type: opponentType,
    opponent_id: opponentId,
    opponent_name: opponentName,
    opponent_team: Array.isArray(opponentTeam) ? opponentTeam : [],
    player_team: Array.isArray(playerTeam) ? playerTeam : [],
    turns: Math.max(0, Number(turns) || 0),
    created_at: new Date().toISOString(),
  };

  if (!isConfigured()) {
    const rows = readLocalStore(BATTLE_HISTORY_KEY);
    rows.push({ ...payload, id: fakeId() });
    writeLocalStore(BATTLE_HISTORY_KEY, rows);
    return;
  }

  try {
    await supabase.from('battle_history').insert({
      user_id: userId,
      result,
      mode,
      opponent_type: opponentType,
      opponent_id: opponentId,
      opponent_name: opponentName,
      opponent_team: payload.opponent_team,
      player_team: payload.player_team,
      turns: payload.turns,
      created_at: payload.created_at,
    });
  } catch (err) {
    console.error('Error recording battle result:', err.message);
  }
}

/**
 * Append a card obtained to the user's recent-pulls feed.
 * Fire-and-forget (never throws).
 */
export async function recordCardPull({
  userId,
  pokemonId,
  cardType,
  starLevel = 1,
  isShiny = false,
  wasNew = false,
} = {}) {
  if (!userId || !pokemonId) return;

  const payload = {
    user_id: userId,
    pokemon_id: Number(pokemonId),
    card_type: cardType,
    star_level: Math.max(1, Number(starLevel) || 1),
    is_shiny: Boolean(isShiny),
    was_new: Boolean(wasNew),
    created_at: new Date().toISOString(),
  };

  if (!isConfigured()) {
    const rows = readLocalStore(CARD_PULLS_KEY);
    rows.push({ ...payload, id: fakeId() });
    writeLocalStore(CARD_PULLS_KEY, rows);
    return;
  }

  try {
    await supabase.from('card_pulls').insert({
      user_id: userId,
      pokemon_id: payload.pokemon_id,
      card_type: cardType,
      star_level: payload.star_level,
      is_shiny: payload.is_shiny,
      was_new: payload.was_new,
      created_at: payload.created_at,
    });
  } catch (err) {
    console.error('Error recording card pull:', err.message);
  }
}

/**
 * Fetch the user's battle history (newest first).
 */
export async function fetchBattleHistory(userId, limit = 400) {
  if (!userId) return [];

  if (!isConfigured()) {
    const rows = readLocalStore(BATTLE_HISTORY_KEY).filter((r) => r.user_id === userId);
    return rows.slice(-limit).reverse();
  }

  try {
    const { data, error } = await supabase
      .from('battle_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching battle history:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching battle history:', err.message);
    return [];
  }
}

/**
 * Fetch the user's most recent card pulls (newest first).
 */
export async function fetchRecentPulls(userId, limit = 20) {
  if (!userId) return [];

  if (!isConfigured()) {
    const rows = readLocalStore(CARD_PULLS_KEY).filter((r) => r.user_id === userId);
    return rows.slice(-limit).reverse();
  }

  try {
    const { data, error } = await supabase
      .from('card_pulls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching card pulls:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching card pulls:', err.message);
    return [];
  }
}
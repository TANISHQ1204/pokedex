import learnsets from '../data/learnsets.json' with { type: 'json' };
import { newlyUnlockedMove } from '../game/cardLevels.js';
import { rollArcadeCards } from '../game/drops.js';
import { fullPokemonList } from '../utils/pokemonCatalog.js';
import { awardCard, getUserCollection } from './collection.js';
import { recordCardPull } from './stats.js';
import {
  applyAwardToRows,
  readCollectionCache,
  upsertRowsEntry,
  writeCollectionCache,
} from './collectionCache.js';
import { queueArcadeAward } from './arcadeRewardQueue.js';

function learnsetFor(pokemonId) {
  return learnsets?.[String(pokemonId)] || learnsets?.[pokemonId] || [];
}

function previewDrop(pokemon) {
  return {
    dropType: 'normal',
    pokemon,
    isNew: true,
    entry: { star_level: 1, dupes_collected: 0, is_shiny: false },
    preview: true,
  };
}

function buildDrop(card, reward, entry) {
  const drop = {
    dropType: 'normal',
    pokemon: card,
    ...reward,
    entry,
  };

  if (reward.starUpgraded) {
    const previousStar = Math.max(1, (Number(entry.star_level) || 2) - 1);
    drop.unlockedMove = newlyUnlockedMove(learnsetFor(card.id), previousStar);
  }

  return drop;
}

export async function awardArcadeRunCards({ userId, cardCount = 1 } = {}) {
  const safeCount = Math.max(1, Math.min(3, Math.floor(Number(cardCount) || 1)));
  let online = typeof navigator === 'undefined' || navigator.onLine !== false;
  let collection = [];

  if (userId) {
    if (online) {
      try {
        collection = await getUserCollection(userId, { allowCache: true });
      } catch (error) {
        console.error('Could not load collection for arcade rewards:', error);
        collection = readCollectionCache(userId) || [];
        online = false;
      }
    } else {
      collection = readCollectionCache(userId) || [];
    }
  }

  const pokemon = rollArcadeCards(collection, fullPokemonList, safeCount);

  if (!userId) return { drops: pokemon.map(previewDrop), pendingSync: false };

  const drops = [];
  let workingCollection = collection;
  let pendingSync = false;

  for (const card of pokemon) {
    if (online) {
      try {
        const reward = await awardCard(userId, card.id);
        const entry = reward.entry || { star_level: 1, dupes_collected: 0, is_shiny: false };
        drops.push(buildDrop(card, reward, entry));

        workingCollection = upsertRowsEntry(workingCollection, entry);
        writeCollectionCache(userId, workingCollection);

        void recordCardPull({
          userId,
          pokemonId: card.id,
          cardType: 'normal',
          starLevel: entry.star_level || 1,
          isShiny: Boolean(entry.is_shiny),
          wasNew: Boolean(reward.isNew),
        });
        continue;
      } catch (error) {
        console.error('Arcade reward could not be saved online; saving locally:', error);
        online = false;
        pendingSync = true;
      }
    }

    const local = applyAwardToRows(workingCollection, card.id);
    workingCollection = local.rows;
    writeCollectionCache(userId, workingCollection);
    queueArcadeAward(userId, local.target);
    pendingSync = true;
    drops.push(buildDrop(card, local.drop, local.drop.entry));
  }

  return { drops, pendingSync };
}

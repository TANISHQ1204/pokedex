import learnsets from '../data/learnsets.json' with { type: 'json' };
import { newlyUnlockedMove } from '../game/cardLevels.js';
import { rollArcadeCards } from '../game/drops.js';
import { fullPokemonList } from '../utils/pokemonCatalog.js';
import { awardCard, getUserCollection } from './collection.js';
import { recordCardPull } from './stats.js';

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

export async function awardArcadeRunCards({ userId, cardCount = 1 } = {}) {
  const safeCount = Math.max(1, Math.min(3, Math.floor(Number(cardCount) || 1)));
  const collection = userId ? await getUserCollection(userId) : [];
  const pokemon = rollArcadeCards(collection, fullPokemonList, safeCount);

  if (!userId) return pokemon.map(previewDrop);

  const drops = [];
  for (const card of pokemon) {
    const reward = await awardCard(userId, card.id);
    const entry = reward.entry || { star_level: 1, dupes_collected: 0, is_shiny: false };
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

    drops.push(drop);
    void recordCardPull({
      userId,
      pokemonId: card.id,
      cardType: 'normal',
      starLevel: entry.star_level || 1,
      isShiny: Boolean(entry.is_shiny),
      wasNew: Boolean(reward.isNew),
    });
  }

  return drops;
}

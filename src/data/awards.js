import baseCollections from './collections.json' with { type: 'json' };
import loreCollections from './loreCollections.json' with { type: 'json' };
import baseBadges from './badges.json' with { type: 'json' };
import loreBadges from './loreBadges.json' with { type: 'json' };

export const allCollections = [...baseCollections, ...loreCollections];
export const allBadges = [...baseBadges, ...loreBadges];

export const COLLECTION_CATEGORIES = [
  { id: 'all', label: 'All Collections', accent: '#38bdf8', design: 'shield' },
  { id: 'type', label: 'Type Masters', accent: '#38bdf8', design: 'star' },
  { id: 'rarity', label: 'Rarity & BST', accent: '#a855f7', design: 'crystal' },
  { id: 'family', label: 'Evolution Families', accent: '#22c55e', design: 'dna' },
  { id: 'legendary', label: 'Legendary Lore', accent: '#fbbf24', design: 'crown' },
  { id: 'mythical', label: 'Mythical', accent: '#f472b6', design: 'prism' },
  { id: 'mascot', label: 'Box Mascots', accent: '#f59e0b', design: 'sun' },
  { id: 'starter', label: 'Starters', accent: '#ef4444', design: 'pokeball' },
  { id: 'fossil', label: 'Fossils', accent: '#c2a26b', design: 'fossil' },
  { id: 'pseudo', label: 'Pseudo-Legends', accent: '#8b5cf6', design: 'fang' },
  { id: 'eevee', label: 'Eeveelutions', accent: '#fbbf24', design: 'star' },
  { id: 'baby', label: 'Baby Pokemon', accent: '#f9a8d4', design: 'heart' },
  { id: 'ultrabeast', label: 'Ultra Beasts', accent: '#a855f7', design: 'eye' },
  { id: 'paradox', label: 'Paradox', accent: '#22d3ee', design: 'prism' },
  { id: 'regional', label: 'Regional Forms', accent: '#34d399', design: 'compass' },
  { id: 'mega', label: 'Mega Evolution', accent: '#22d3ee', design: 'crystal' },
  { id: 'gmax', label: 'Gigantamax', accent: '#ef4444', design: 'gear' },
  { id: 'gym', label: 'Gym Leaders', accent: '#f59e0b', design: 'shield' },
  { id: 'elite', label: 'Elite Four', accent: '#a78bfa', design: 'laurel' },
  { id: 'champion', label: 'Champions', accent: '#fbbf24', design: 'crown' },
  { id: 'villain', label: 'Villain Teams', accent: '#dc2626', design: 'skull' },
  { id: 'frontier', label: 'Battle Frontier', accent: '#38bdf8', design: 'compass' },
  { id: 'contest', label: 'Contests', accent: '#ec4899', design: 'ribbon' },
];

export const BADGE_FAMILIES = [
  { id: 'all', label: 'All Badges', accent: '#fbbf24', design: 'shield' },
  { id: 'regional', label: 'Regional Champion', accent: '#4ade80', design: 'shield' },
  { id: 'gym', label: 'Gym Badges', accent: '#f59e0b', design: 'shield' },
  { id: 'elite', label: 'Elite Four', accent: '#a78bfa', design: 'laurel' },
  { id: 'champion', label: 'Champions', accent: '#fbbf24', design: 'crown' },
  { id: 'villain', label: 'Villain Teams', accent: '#dc2626', design: 'skull' },
  { id: 'frontier', label: 'Frontier Symbols', accent: '#38bdf8', design: 'compass' },
  { id: 'contest', label: 'Contest Ribbons', accent: '#ec4899', design: 'ribbon' },
  { id: 'type', label: 'Type Mastery', accent: '#38bdf8', design: 'star' },
  { id: 'legendary', label: 'Legendary Lore', accent: '#fbbf24', design: 'crown' },
  { id: 'special', label: 'Special Lore', accent: '#a855f7', design: 'prism' },
  { id: 'milestone', label: 'Milestones', accent: '#fbbf24', design: 'medal' },
  { id: 'mastery', label: 'Mastery', accent: '#f472b6', design: 'crown' },
];

export const COLLECTION_CATEGORY_MAP = new Map(
  COLLECTION_CATEGORIES.map((category) => [category.id, category])
);

export const BADGE_FAMILY_MAP = new Map(
  BADGE_FAMILIES.map((family) => [family.id, family])
);

const LEGACY_REGIONAL_IDS = new Set([
  'badge_kanto',
  'badge_johto',
  'badge_hoenn',
  'badge_sinnoh',
  'badge_unova',
  'badge_kalos',
  'badge_alola',
  'badge_galar',
  'badge_paldea',
]);

export function getCollectionCategoryMeta(category) {
  return COLLECTION_CATEGORY_MAP.get(category) || {
    id: category || 'all',
    label: category ? category.replace(/_/g, ' ') : 'Collections',
    accent: '#38bdf8',
    design: 'shield',
  };
}

export function getBadgeFamily(badge) {
  if (!badge) return 'gym';
  if (badge.family) return badge.family;
  if (badge.criteria === 'star20' || badge.criteria === 'star10') return 'mastery';
  if (String(badge.id || '').startsWith('badge_master_') || badge.id === 'badge_shiny_master') {
    return 'mastery';
  }
  if (LEGACY_REGIONAL_IDS.has(badge.id)) return 'regional';
  return 'gym';
}

export function getBadgeFamilyMeta(family) {
  return BADGE_FAMILY_MAP.get(family) || {
    id: family || 'special',
    label: family ? family.replace(/_/g, ' ') : 'Special',
    accent: '#a855f7',
    design: 'shield',
  };
}

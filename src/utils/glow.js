export const TYPE_GLOW_HUES = {
  normal: 210,
  fire: 24,
  water: 199,
  grass: 142,
  electric: 50,
  ice: 199,
  fighting: 4,
  poison: 283,
  ground: 32,
  flying: 238,
  psychic: 330,
  bug: 83,
  rock: 25,
  ghost: 270,
  dragon: 239,
  dark: 215,
  steel: 210,
  fairy: 330,
};

export function glowBaseFor(types) {
  const t = Array.isArray(types) ? types[0] : types;
  return TYPE_GLOW_HUES[t] || 210;
}
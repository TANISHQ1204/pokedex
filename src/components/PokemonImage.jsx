import { useEffect, useState } from 'react';
import { spriteCandidates } from '../utils/sprites';

/**
 * <img> wrapper that walks the sprite fallback chain (record sprite -> PokeAPI
 * CDN) via onError, guaranteeing alternate-form and shiny variants never render
 * a broken-image icon. Remounts its chain whenever the pokemon or shiny flag
 * changes so navigating between records always starts at the best candidate.
 */
export default function PokemonImage({ pokemon, isShiny = false, alt, className, style, ...rest }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [pokemon && pokemon.id, isShiny]);

  const urls = spriteCandidates(pokemon, isShiny);
  if (urls.length === 0) return null;
  const src = urls[Math.min(step, urls.length - 1)];

  return (
    <img
      src={src}
      alt={alt || (pokemon && (pokemon.display || pokemon.name)) || ''}
      className={className}
      style={style}
      draggable={false}
      onError={() => setStep((s) => Math.min(s + 1, urls.length - 1))}
      {...rest}
    />
  );
}
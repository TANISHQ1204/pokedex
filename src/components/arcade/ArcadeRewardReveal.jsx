import React, { useState } from 'react';
import CardPullReveal from '../CardPullReveal';

export default function ArcadeRewardReveal({ drops = [], onComplete, onPlayAgain }) {
  const [index, setIndex] = useState(0);
  const drop = drops[index];
  if (!drop) return null;

  const isLast = index >= drops.length - 1;
  const continueLabel = isLast ? 'View run summary' : `Next card (${index + 2} of ${drops.length})`;

  return (
    <CardPullReveal
      key={`${index}-${drop.pokemon?.id || 'card'}`}
      awardedDrop={drop}
      continueLabel={continueLabel}
      playAgainLabel="Play again"
      showPlayAgain={isLast}
      onContinue={() => {
        if (isLast) onComplete?.();
        else setIndex((value) => value + 1);
      }}
      onPlayAgain={() => {
        onComplete?.();
        onPlayAgain?.();
      }}
    />
  );
}

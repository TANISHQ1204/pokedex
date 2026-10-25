import React from 'react';
import { MAX_STAR_LEVEL, clampStarLevel, starTierClass, starTierInfo } from '../game/cardLevels.js';

export default function StarMeter({
  starLevel = 1,
  size = 'md',
  showLabel = true,
  showCount = true,
  animated = false,
  className = '',
}) {
  const star = clampStarLevel(starLevel);
  const tier = starTierInfo(star);

  return (
    <div
      className={`star-meter star-meter-${size} ${starTierClass(star)} ${className}`.trim()}
      role="img"
      aria-label={`${star} of ${MAX_STAR_LEVEL} stars, ${tier.label} tier`}
      title={`${tier.label} — ${star}/${MAX_STAR_LEVEL} stars`}
    >
      <div className="star-meter-track" aria-hidden="true">
        {Array.from({ length: MAX_STAR_LEVEL }, (_, index) => {
          const isFilled = index < star;
          const isNewest = animated && index === star - 1;
          return (
            <span
              key={index}
              className={`star-meter-segment ${isFilled ? 'is-filled' : ''} ${isNewest ? 'is-newest' : ''}`.trim()}
            />
          );
        })}
      </div>
      {(showLabel || showCount) && (
        <div className="star-meter-meta" aria-hidden="true">
          {showLabel && <span className="star-meter-label">{tier.label}</span>}
          {showCount && (
            <span className="star-meter-count">
              {star}<span>/{MAX_STAR_LEVEL}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

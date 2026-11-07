import React from 'react';

export default function TierCardFx({ className = '' }) {
  return (
    <span className={`tier-card-fx ${className}`.trim()} aria-hidden="true">
      <span className="tier-card-aura" />
      <span className="tier-card-frame" />
      <span className="tier-card-ornaments" />
      <span className="tier-card-sheen" />
      <span className="tier-card-sparks" />
    </span>
  );
}

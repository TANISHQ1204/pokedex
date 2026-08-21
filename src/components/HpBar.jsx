import React from 'react';

export default function HpBar({ currentHp, maxHp }) {
  const hpRatio = Math.max(0, Math.min(1, (currentHp || 0) / (maxHp || 1)));
  const percentage = Math.round(hpRatio * 100);

  let hpColorClass = 'hp-green';
  if (hpRatio < 0.2) {
    hpColorClass = 'hp-red';
  } else if (hpRatio < 0.5) {
    hpColorClass = 'hp-yellow';
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>
        <span>HP</span>
        <span>{Math.max(0, currentHp)} / {maxHp}</span>
      </div>
      <div className="hp-bar-outer">
        <div
          className={`hp-bar-inner ${hpColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

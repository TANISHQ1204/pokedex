import React from 'react';

export default function BenchRow({
  team,
  activeIndex,
  align = 'left',
  onSelectSlot,
  isInteractive = false,
  canSwitch = true,
  switchDisabledReason = '',
  revealedIndices = null,
}) {
  if (!team || !Array.isArray(team)) return null;

  return (
    <div className="bench-row" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {team.map((pkmn, idx) => {
        const isActive = idx === activeIndex;
        const isFainted = pkmn.currentHp <= 0;
        const isClickable = isInteractive && canSwitch && !isActive && !isFainted;
        const isRevealed =
          !revealedIndices ||
          (revealedIndices instanceof Set
            ? revealedIndices.has(idx)
            : Array.isArray(revealedIndices)
            ? revealedIndices.includes(idx)
            : true);

        if (!isRevealed) {
          return (
            <div
              key={pkmn.instanceId || idx}
              className="bench-slot unrevealed"
              title="???"
            >
              {pkmn.sprites?.normal ? (
                <img src={pkmn.sprites.normal} alt="???" className="bench-silhouette" />
              ) : (
                <span className="bench-unknown-q">?</span>
              )}
            </div>
          );
        }

        let tooltipText = `${pkmn.name.toUpperCase()} (${isFainted ? 'Fainted' : `HP: ${pkmn.currentHp}/${pkmn.maxHp}`})`;
        if (isClickable) {
          tooltipText = `Click to switch to ${pkmn.name.toUpperCase()} (HP: ${pkmn.currentHp}/${pkmn.maxHp})`;
        } else if (isInteractive && !canSwitch && !isActive && !isFainted) {
          tooltipText = switchDisabledReason || 'Must attack at least once before switching out again!';
        }

        return (
          <div
            key={pkmn.instanceId || idx}
            className={`bench-slot ${isActive ? 'active' : ''} ${isFainted ? 'fainted' : ''} ${isClickable ? 'clickable' : ''}`}
            title={tooltipText}
            onClick={() => {
              if (isClickable && onSelectSlot) {
                onSelectSlot(idx);
              }
            }}
          >
            <img src={pkmn.sprites?.normal} alt={pkmn.name} />
          </div>
        );
      })}
    </div>
  );
}

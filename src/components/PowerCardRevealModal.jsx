import React, { useState, useEffect } from 'react';
import PowerCard from './PowerCard';
import './PowerCardRevealModal.css';

export default function PowerCardRevealModal({ pokemon, isOpen, onClose, initialShiny = false }) {
  const [stage, setStage] = useState('anticipating'); // 'anticipating' -> 'flipping' -> 'revealed'
  const [isShiny, setIsShiny] = useState(initialShiny);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStage('anticipating');
      setShowFlash(false);
      return;
    }

    setIsShiny(initialShiny);
    setStage('anticipating');

    // Stage 1: Shake anticipation (1.2s)
    const t1 = setTimeout(() => {
      setStage('flipping');
    }, 1200);

    // Stage 2: Flip & flash burst (2.0s)
    const t2 = setTimeout(() => {
      setStage('revealed');
      setShowFlash(true);
    }, 2000);

    // Stage 3: Turn off flash burst (2.8s)
    const t3 = setTimeout(() => {
      setShowFlash(false);
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, initialShiny]);

  const handleReplay = () => {
    setStage('anticipating');
    setShowFlash(false);

    setTimeout(() => {
      setStage('flipping');
    }, 1200);

    setTimeout(() => {
      setStage('revealed');
      setShowFlash(true);
    }, 2000);

    setTimeout(() => {
      setShowFlash(false);
    }, 2800);
  };

  if (!isOpen || !pokemon) return null;

  return (
    <div className="power-reveal-overlay" onClick={onClose}>
      {showFlash && <div className="power-reveal-flash" />}

      <div className="power-reveal-content" onClick={(e) => e.stopPropagation()}>
        <div className="power-reveal-header">
          <div className="power-reveal-title">
            <span className="reveal-sparkle">✨</span> POWER CARD REVEAL CONCEPT <span className="reveal-sparkle">✨</span>
          </div>
          <button className="power-reveal-close" onClick={onClose}>✕</button>
        </div>

        <div className={`power-reveal-stage stage-${stage}`}>
          {stage === 'anticipating' && (
            <div className="power-reveal-pack-shake">
              <div className="power-pack-orb">⚡</div>
              <div className="power-pack-label">CHARGING ULTRA POWER DROP...</div>
            </div>
          )}

          {(stage === 'flipping' || stage === 'revealed') && (
            <div className={`power-card-flip-container ${stage === 'flipping' ? 'is-flipping' : 'is-revealed'}`}>
              <PowerCard pokemon={pokemon} isShiny={isShiny} enableTilt={stage === 'revealed'} />
            </div>
          )}
        </div>

        {stage === 'revealed' && (
          <div className="power-reveal-actions">
            <button
              className="power-btn power-btn-shiny"
              onClick={() => setIsShiny(!isShiny)}
            >
              {isShiny ? '✨ Shiny Active' : '⭐ Toggle Shiny'}
            </button>
            <button className="power-btn power-btn-replay" onClick={handleReplay}>
              🔄 Replay Reveal
            </button>
            <button className="power-btn power-btn-close" onClick={onClose}>
              Done Reviewing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

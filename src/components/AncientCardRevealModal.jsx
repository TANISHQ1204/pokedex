import React, { useState, useEffect } from 'react';
import AncientCard from './AncientCard';
import './PowerCardRevealModal.css';

export default function AncientCardRevealModal({ pokemon, isOpen, onClose }) {
  const [stage, setStage] = useState('anticipating');
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStage('anticipating');
      setShowFlash(false);
      return;
    }

    setStage('anticipating');

    const t1 = setTimeout(() => setStage('flipping'), 1200);
    const t2 = setTimeout(() => { setStage('revealed'); setShowFlash(true); }, 2000);
    const t3 = setTimeout(() => setShowFlash(false), 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isOpen]);

  const handleReplay = () => {
    setStage('anticipating');
    setShowFlash(false);
    setTimeout(() => setStage('flipping'), 1200);
    setTimeout(() => { setStage('revealed'); setShowFlash(true); }, 2000);
    setTimeout(() => setShowFlash(false), 2800);
  };

  if (!isOpen || !pokemon) return null;

  return (
    <div className="power-reveal-overlay" onClick={onClose}>
      {showFlash && <div className="power-reveal-flash" />}

      <div className="power-reveal-content" onClick={(e) => e.stopPropagation()} style={{ borderColor: '#b89a6c', boxShadow: '0 0 50px rgba(184, 154, 108, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.08)' }}>
        <div className="power-reveal-header">
          <div className="power-reveal-title" style={{ color: '#b89a6c', textShadow: '0 0 10px rgba(184, 154, 108, 0.6)' }}>
            <span className="reveal-sparkle">🏛️</span> ANCIENT CARD REVEAL <span className="reveal-sparkle">🏛️</span>
          </div>
          <button className="power-reveal-close" onClick={onClose}>✕</button>
        </div>

        <div className={`power-reveal-stage stage-${stage}`}>
          {stage === 'anticipating' && (
            <div className="power-reveal-pack-shake">
              <div className="power-pack-orb" style={{ background: 'radial-gradient(circle, #b89a6c 0%, #8a6a3c 60%, transparent 70%)', boxShadow: '0 0 40px #b89a6c, 0 0 80px #8a6a3c' }}>🏛️</div>
              <div className="power-pack-label" style={{ color: '#b89a6c', textShadow: '0 0 10px rgba(184, 154, 108, 0.8)' }}>UNCOVERING ANCIENT RELIC...</div>
            </div>
          )}

          {(stage === 'flipping' || stage === 'revealed') && (
            <div className={`power-card-flip-container ${stage === 'flipping' ? 'is-flipping' : 'is-revealed'}`}>
              <AncientCard pokemon={pokemon} enableTilt={stage === 'revealed'} />
            </div>
          )}
        </div>

        {stage === 'revealed' && (
          <div className="power-reveal-actions">
            <button className="power-btn power-btn-replay" onClick={handleReplay} style={{ background: 'linear-gradient(90deg, #b89a6c, #8a6a3c)', boxShadow: '0 4px 14px rgba(184, 154, 108, 0.4)' }}>
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

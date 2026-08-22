import React, { useEffect, useRef } from 'react';

export default function BattleLog({ logs }) {
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="battle-log-container" ref={logContainerRef}>
      {logs.length === 0 ? (
        <div style={{ color: '#64748b', fontStyle: 'italic' }}>Battle ready. Choose a move to begin!</div>
      ) : (
        logs.map((log, index) => {
          let className = 'log-entry';
          if (log.isSuperEffective) className += ' super-effective';
          if (log.isFaint) className += ' faint';
          if (log.isHeal) className += ' heal';

          return (
            <div key={index} className={className}>
              › {log.text}
            </div>
          );
        })
      )}
    </div>
  );
}

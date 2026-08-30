import React from 'react';

let activeCard = null;
let lastX = 0;
let lastY = 0;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const updateCard = (card, x, y) => {
  if (!card || typeof card.getBoundingClientRect !== 'function') return;
  const rect = card.getBoundingClientRect();
  let gx = x - rect.left;
  const gy = y - rect.top;
  const flipped =
    card.closest && typeof card.closest === 'function'
      ? card.closest('.card-3d-body.flipped')
      : null;
  if (flipped) gx = rect.width - gx;
  card.style.setProperty('--gx', gx.toFixed(2));
  card.style.setProperty('--gy', gy.toFixed(2));
  card.style.setProperty(
    '--xp',
    (rect.width > 0 ? clamp01(gx / rect.width) : 0).toFixed(3)
  );
  card.style.setProperty(
    '--yp',
    (rect.height > 0 ? clamp01(gy / rect.height) : 0).toFixed(3)
  );
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const angle = (Math.atan2(gy - cy, gx - cx) * 180) / Math.PI;
  card.style.setProperty('--angle', angle.toFixed(1));
};

const syncPointer = (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;

  const x = e.clientX;
  const y = e.clientY;
  lastX = x;
  lastY = y;

  const root = document.documentElement;
  root.style.setProperty('--x', x.toFixed(2));
  root.style.setProperty('--xp', clamp01(x / window.innerWidth).toFixed(3));
  root.style.setProperty('--y', y.toFixed(2));
  root.style.setProperty('--yp', clamp01(y / window.innerHeight).toFixed(3));

  const card =
    e.target && typeof e.target.closest === 'function'
      ? e.target.closest('[data-glow]')
      : null;
  activeCard = card;
  if (card) updateCard(card, x, y);
};

const repaintActive = () => {
  if (activeCard) updateCard(activeCard, lastX, lastY);
};

export default function usePointerGlow() {
  React.useEffect(() => {
    document.addEventListener('pointermove', syncPointer, { passive: true });
    document.addEventListener('scroll', repaintActive, { capture: true, passive: true });
    window.addEventListener('resize', repaintActive);
    return () => {
      document.removeEventListener('pointermove', syncPointer);
      document.removeEventListener('scroll', repaintActive, { capture: true });
      window.removeEventListener('resize', repaintActive);
    };
  }, []);
}
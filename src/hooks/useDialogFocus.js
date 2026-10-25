import { useEffect, useRef } from 'react';

const dialogStack = [];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

function getFocusable(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0
  );
}

export default function useDialogFocus(containerRef, { active = true, onEscape, initialFocusRef } = {}) {
  const onEscapeRef = useRef(onEscape);
  const initialFocusRefRef = useRef(initialFocusRef);

  useEffect(() => {
    onEscapeRef.current = onEscape;
    initialFocusRefRef.current = initialFocusRef;
  }, [onEscape, initialFocusRef]);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const entry = { container };
    const previouslyFocused = document.activeElement;
    dialogStack.push(entry);

    if (dialogStack.length === 1) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      previousBodyOverflow = document.body.style.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    const focusFrame = requestAnimationFrame(() => {
      const target =
        initialFocusRefRef.current?.current ||
        container.querySelector('[data-autofocus]') ||
        getFocusable(container)[0] ||
        container;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (dialogStack[dialogStack.length - 1] !== entry) return;

      if (event.key === 'Escape') {
        if (onEscapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !container.contains(current)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (current === last || !container.contains(current)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      const index = dialogStack.indexOf(entry);
      if (index >= 0) dialogStack.splice(index, 1);

      if (dialogStack.length === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.paddingRight = previousBodyPaddingRight;
      }

      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}

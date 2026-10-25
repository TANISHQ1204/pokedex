import { useEffect, useRef, useState } from 'react';

export default function useArcadeTimer(seconds, onExpire, active = true) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor(Number(seconds) || 0)));
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active) return undefined;
    const interval = setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!active || timeLeft > 0 || expiredRef.current) return;
    expiredRef.current = true;
    onExpireRef.current?.();
  }, [active, timeLeft]);

  return timeLeft;
}

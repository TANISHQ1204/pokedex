import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  flushArcadeRewards,
  getPendingArcadeRewardCount,
} from '../store/arcadeRewardQueue';

export default function useArcadeRewardSync() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(
    () => getPendingArcadeRewardCount(user?.id)
  );

  const sync = useCallback(async () => {
    if (!user?.id) {
      setPendingCount(0);
      return 0;
    }

    const remaining = await flushArcadeRewards(user.id);
    setPendingCount(remaining);
    return remaining;
  }, [user?.id]);

  useEffect(() => {
    setPendingCount(getPendingArcadeRewardCount(user?.id));
    sync();
    const handleOnline = () => sync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sync, user?.id]);

  return { pendingCount, sync };
}

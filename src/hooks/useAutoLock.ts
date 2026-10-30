import { useEffect, useRef } from 'react';

interface UseAutoLockOptions {
  timeoutMinutes: number; // 0: 立即上鎖或視窗切換上鎖, >0: 閒置分鐘數
  onLock: () => void;
  isEnabled: boolean;
}

export function useAutoLock({ timeoutMinutes, onLock, isEnabled }: UseAutoLockOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (timeoutMinutes > 0) {
        timerRef.current = setTimeout(() => {
          onLock();
        }, timeoutMinutes * 60 * 1000);
      }
    };

    // 視窗離開或手機縮小到背景時的隱私保護
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 若設定為 0 分鐘或切換視窗立即上鎖
        if (timeoutMinutes === 0) {
          onLock();
        }
      } else {
        resetTimer();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 初始化重置
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeoutMinutes, onLock, isEnabled]);
}

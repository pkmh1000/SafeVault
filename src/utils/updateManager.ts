import { useState, useEffect, useCallback } from 'react';
import { CURRENT_APP_VERSION } from './version';

export interface AppUpdateState {
  hasPendingUpdate: boolean;
  isLatestVersion: boolean;
  isChecking: boolean;
  checkResultMsg: string;
  checkForUpdates: () => Promise<boolean>;
  applyUpdate: () => void;
  dismissBanner: () => void;
  isBannerDismissed: boolean;
}

export function useAppUpdate(): AppUpdateState {
  const [hasPendingUpdate, setHasPendingUpdate] = useState<boolean>(false);
  const [isLatestVersion, setIsLatestVersion] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkResultMsg, setCheckResultMsg] = useState<string>('');
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    return localStorage.getItem('safevault_update_banner_dismissed') === 'true';
  });

  // Check SW registrations for waiting or installing updates on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const checkWaitingWorker = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.waiting) {
            setHasPendingUpdate(true);
            setIsLatestVersion(false);
            return;
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasPendingUpdate(true);
                  setIsLatestVersion(false);
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn('SW check error', err);
      }
    };

    checkWaitingWorker();

    // Listen for manual updates broadcast
    const handleUpdateFoundCustom = () => {
      setHasPendingUpdate(true);
      setIsLatestVersion(false);
    };

    window.addEventListener('safevault_update_ready', handleUpdateFoundCustom);
    return () => {
      window.removeEventListener('safevault_update_ready', handleUpdateFoundCustom);
    };
  }, []);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setCheckResultMsg('');

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setIsChecking(false);
      setIsLatestVersion(true);
      setCheckResultMsg(`已是最新版本 (${CURRENT_APP_VERSION})`);
      return false;
    }

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      let updateFound = false;

      for (const reg of regs) {
        if (reg.waiting) {
          updateFound = true;
          break;
        }
        await reg.update();
        if (reg.waiting || reg.installing) {
          updateFound = true;
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      if (updateFound) {
        setHasPendingUpdate(true);
        setIsLatestVersion(false);
        setCheckResultMsg('發現新版本！請點擊立即更新進行載入。');
        return true;
      } else {
        setHasPendingUpdate(false);
        setIsLatestVersion(true);
        setCheckResultMsg(`檢查完成：目前已是最新版本 (${CURRENT_APP_VERSION})，無待更新項目！`);
        return false;
      }
    } catch {
      setIsLatestVersion(true);
      setCheckResultMsg(`檢查完成：目前已是最新版本 (${CURRENT_APP_VERSION})`);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      });
    }

    window.location.reload();
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    localStorage.setItem('safevault_update_banner_dismissed', 'true');
  }, []);

  return {
    hasPendingUpdate,
    isLatestVersion,
    isChecking,
    checkResultMsg,
    checkForUpdates,
    applyUpdate,
    dismissBanner,
    isBannerDismissed,
  };
}

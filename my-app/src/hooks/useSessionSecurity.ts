import { useEffect, useRef, useCallback } from 'react';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minuti di inattività
const WARNING_TIME = 2 * 60 * 1000; // Avvertimento 2 minuti prima

interface SessionSecurityConfig {
  timeoutMs?: number;
  warningMs?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
}

export const useSessionSecurity = (config: SessionSecurityConfig = {}) => {
  const {
    timeoutMs = SESSION_TIMEOUT,
    warningMs = WARNING_TIME,
    onTimeout,
    onWarning
  } = config;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  // Reset timers on activity
  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    if (warningRef.current) clearTimeout(warningRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        onWarning?.();
      }
    }, timeoutMs - warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMs);
  }, [timeoutMs, warningMs, onWarning, onTimeout]);

  useEffect(() => {
    // List of events that reset the timer
    const resetEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimers();
    };

    // Attach listeners
    resetEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timer setup
    resetTimers();

    // Cleanup on unmount
    return () => {
      resetEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (warningRef.current) clearTimeout(warningRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimers]);

  // Logout on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('token');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {};
};

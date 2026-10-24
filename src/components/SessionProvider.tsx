"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OPENED_STORAGE_KEY } from "@/lib/session";
import type { CookieSession, SessionData } from "@/lib/types";

interface SessionContextValue {
  session: SessionData | null;
  hasOpened: (code: string) => boolean;
  markOpened: (code: string) => void;
  clearOpened: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface StoredOpened {
  since: number;
  opened: string[];
}

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: CookieSession | null;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    if (!initialSession) return;
    try {
      const raw = window.localStorage.getItem(OPENED_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as StoredOpened;
      if (saved && saved.since === initialSession.since && Array.isArray(saved.opened)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state from localStorage
        setOpened(saved.opened);
      }
    } catch {
      // ignore malformed storage
    }
    // Only re-run if the underlying signed-in session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSession?.since]);

  const markOpened = useCallback(
    (code: string) => {
      if (!initialSession) return;
      setOpened((prev) => {
        if (prev.includes(code)) return prev;
        const next = [...prev, code];
        try {
          const payload: StoredOpened = { since: initialSession.since, opened: next };
          window.localStorage.setItem(OPENED_STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // ignore storage failures (private mode, quota, etc.)
        }
        return next;
      });
    },
    [initialSession],
  );

  const clearOpened = useCallback(() => {
    setOpened([]);
    try {
      window.localStorage.removeItem(OPENED_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const hasOpened = useCallback((code: string) => opened.includes(code), [opened]);

  const session: SessionData | null = useMemo(() => {
    if (!initialSession) return null;
    return { user: initialSession.user, since: initialSession.since, groups: initialSession.groups, opened };
  }, [initialSession, opened]);

  const value = useMemo(
    () => ({ session, hasOpened, markOpened, clearOpened }),
    [session, hasOpened, markOpened, clearOpened],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}

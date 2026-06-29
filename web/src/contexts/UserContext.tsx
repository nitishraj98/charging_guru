"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { checkAuth, isLoggedIn } from "@/lib/auth";
import { auth, User } from "@/lib/api";

interface UserCtx {
  user: User | null;
  loggedIn: boolean;
  initial: string;
  reload: () => void;
  clear: () => void;
}

const Ctx = createContext<UserCtx>({
  user: null, loggedIn: false, initial: "U", reload: () => {}, clear: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  // tick increments to force a re-check without caring about previous state
  const [tick, setTick] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const ok = await checkAuth();
      if (cancelled) return;

      if (!ok) {
        setLoggedIn(false);
        setUser(null);
        fetchedRef.current = false;
        return;
      }

      setLoggedIn(true);

      if (fetchedRef.current) return; // already have user data

      try {
        const u = await auth.me();
        if (cancelled) return;
        setUser(u);
        fetchedRef.current = true;
      } catch {
        if (!cancelled) setLoggedIn(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [tick]);

  const reload = useCallback(() => {
    // If already logged in with cookie present, no-op (avoids extra network call)
    if (isLoggedIn() && fetchedRef.current) return;
    setTick(t => t + 1);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setLoggedIn(false);
    fetchedRef.current = false;
    setTick(t => t + 1);
  }, []);

  const initial = user
    ? (user.full_name ?? user.phone ?? "U").charAt(0).toUpperCase() || "U"
    : "U";

  return (
    <Ctx.Provider value={{ user, loggedIn, initial, reload, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUser(): UserCtx {
  return useContext(Ctx);
}

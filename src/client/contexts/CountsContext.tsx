import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { fetchCounts } from "@/lib/api.js";

interface CountsContextValue {
  counts: { new: number; due: number };
  countsError: string | null;
  refreshCounts: () => Promise<void>;
}

const CountsContext = createContext<CountsContextValue | null>(null);

export function CountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState({ new: 0, due: 0 });
  const [countsError, setCountsError] = useState<string | null>(null);

  const refreshCounts = useCallback(async () => {
    try {
      const data = await fetchCounts();
      setCounts(data);
      setCountsError(null);
    } catch (e) {
      setCountsError(e instanceof Error ? e.message : "Failed to load counts");
    }
  }, []);

  return (
    <CountsContext.Provider value={{ counts, countsError, refreshCounts }}>
      {children}
    </CountsContext.Provider>
  );
}

export function useCounts() {
  const ctx = useContext(CountsContext);
  if (!ctx) throw new Error("useCounts must be used within a CountsProvider");
  return ctx;
}

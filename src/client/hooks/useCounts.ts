import { useCallback, useState } from "react";
import { fetchCounts } from "@/lib/api.js";

export function useCounts() {
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

  return { counts, countsError, refreshCounts };
}

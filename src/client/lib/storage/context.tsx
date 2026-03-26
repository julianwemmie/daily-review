import { createContext, useContext, useMemo } from "react";
import { useSession } from "../auth-client.js";
import { ApiStorageProvider } from "./api-provider.js";
import { MemoryStorageProvider } from "./memory-provider.js";
import type { StorageProvider } from "./types.js";

const StorageContext = createContext<StorageProvider | null>(null);

// Singleton so in-memory state persists across re-renders
let memoryProvider: MemoryStorageProvider | null = null;
function getMemoryProvider() {
  if (!memoryProvider) memoryProvider = new MemoryStorageProvider();
  return memoryProvider;
}

const apiProvider = new ApiStorageProvider();

export function StorageProviderRoot({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const provider = useMemo<StorageProvider>(
    () => (session ? apiProvider : getMemoryProvider()),
    [session],
  );

  return <StorageContext.Provider value={provider}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageProvider {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProviderRoot");
  return ctx;
}

export function useIsDemo(): boolean {
  const { data: session } = useSession();
  return !session;
}

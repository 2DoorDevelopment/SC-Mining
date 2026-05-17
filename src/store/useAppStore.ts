import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UexCache {
  rawPrices: unknown
  refinedPrices: unknown
  capacities: unknown
  fetchedAt: number
}

interface AppState {
  sessionCode: string | null
  sessionId: string | null
  displayName: string
  lastSessionCode: string | null
  uexCache: UexCache | null
  lastUsedRefinery: string | null
  lastUsedMethod: string | null

  setSession: (sessionId: string, code: string) => void
  clearSession: () => void
  setDisplayName: (name: string) => void
  setUexCache: (cache: UexCache) => void
  setLastUsedRefinery: (station: string) => void
  setLastUsedMethod: (method: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessionCode: null,
      sessionId: null,
      displayName: '',
      lastSessionCode: null,
      uexCache: null,
      lastUsedRefinery: null,
      lastUsedMethod: null,

      setSession: (sessionId, code) =>
        set({ sessionId, sessionCode: code, lastSessionCode: code }),

      clearSession: () =>
        set({ sessionId: null, sessionCode: null }),

      setDisplayName: (name) => set({ displayName: name }),

      setUexCache: (cache) => set({ uexCache: cache }),

      setLastUsedRefinery: (station) => set({ lastUsedRefinery: station }),

      setLastUsedMethod: (method) => set({ lastUsedMethod: method }),
    }),
    { name: 'quantum-yield-store' },
  ),
)

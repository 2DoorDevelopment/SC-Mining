import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const UEX_BASE = 'https://api.uexcorp.space/2.0'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export interface UexData {
  rawPrices: unknown
  refinedPrices: unknown
  capacities: unknown
  fetchedAt: number
}

export function useUexData() {
  const { uexCache, setUexCache } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [raw, refined, cap] = await Promise.all([
        fetch(`${UEX_BASE}/commodities_raw_prices`).then((r) => r.json()),
        fetch(`${UEX_BASE}/commodities_prices`).then((r) => r.json()),
        fetch(`${UEX_BASE}/refineries_capacities`).then((r) => r.json()),
      ])
      const cache = { rawPrices: raw, refinedPrices: refined, capacities: cap, fetchedAt: Date.now() }
      setUexCache(cache)
    } catch (e) {
      setError('Failed to fetch UEX data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const isStale = !uexCache || Date.now() - uexCache.fetchedAt > CACHE_TTL
    if (isStale) fetchAll()
  }, [])

  return { data: uexCache, loading, error, refresh: fetchAll }
}

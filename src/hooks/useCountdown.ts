import { useEffect, useState } from 'react'

export function useCountdown(endsAt: Date | null): number {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!endsAt) return

    function tick() {
      setRemaining(Math.max(0, Math.floor((endsAt!.getTime() - Date.now()) / 1000)))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return remaining
}

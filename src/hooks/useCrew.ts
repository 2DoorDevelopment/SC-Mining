import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export interface CrewMember {
  id: string
  name: string
  shares: number
  role: string
  bonusAUEC: number
}

export function useCrew(sessionId: string | null) {
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setCrew([])
      setLoading(false)
      return
    }

    const unsub = onSnapshot(
      collection(db, 'sessions', sessionId, 'crewMembers'),
      (snap) => {
        setCrew(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CrewMember))
        setLoading(false)
      },
    )

    return unsub
  }, [sessionId])

  return { crew, loading }
}

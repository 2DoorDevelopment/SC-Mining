import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

interface SessionData {
  code: string
  createdBy: string
  members: string[]
  memberNames: Record<string, string>
  shipName?: string
  location?: string
  status: 'active' | 'completed' | 'archived'
}

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setSession(null)
      setLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
      if (snap.exists()) {
        setSession(snap.data() as SessionData)
      } else {
        setSession(null)
      }
      setLoading(false)
    })

    return unsub
  }, [sessionId])

  return { session, loading }
}

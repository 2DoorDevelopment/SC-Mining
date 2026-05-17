import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export interface WorkOrder {
  id: string
  refineryStation: string
  method: string
  ores: Array<{ oreType: string; rawAmount: number }>
  quotedYield: number
  quotedCost: number
  quotedTime: number
  sellPrice: number
  startedAt: { toDate: () => Date } | null
  completedAt: { toDate: () => Date } | null
  status: 'planning' | 'refining' | 'ready' | 'sold'
  finalSalePrice: number | null
}

export function useWorkOrders(sessionId: string | null) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setWorkOrders([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'sessions', sessionId, 'workOrders'),
      orderBy('status'),
    )

    const unsub = onSnapshot(q, (snap) => {
      setWorkOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkOrder))
      setLoading(false)
    })

    return unsub
  }, [sessionId])

  return { workOrders, loading }
}

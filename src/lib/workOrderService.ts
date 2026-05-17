import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export interface OreRow {
  oreType: string
  rawAmount: number
}

export interface WorkOrderInput {
  refineryStation: string
  method: string
  ores: OreRow[]
  quotedYield: number
  quotedCost: number
  quotedTime: number   // seconds
  sellPrice: number
}

export async function saveWorkOrder(
  sessionId: string,
  uid: string,
  input: WorkOrderInput,
  status: 'planning' | 'refining',
): Promise<string> {
  const ref = await addDoc(collection(db, 'sessions', sessionId, 'workOrders'), {
    ...input,
    createdAt: serverTimestamp(),
    createdBy: uid,
    startedAt: status === 'refining' ? serverTimestamp() : null,
    completedAt: null,
    status,
    finalSalePrice: null,
  })
  return ref.id
}

export async function startRefining(sessionId: string, orderId: string): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId, 'workOrders', orderId), {
    status: 'refining',
    startedAt: serverTimestamp(),
  })
}

export async function markReady(sessionId: string, orderId: string): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId, 'workOrders', orderId), {
    status: 'ready',
    completedAt: serverTimestamp(),
  })
}

export async function markSold(
  sessionId: string,
  orderId: string,
  finalSalePrice: number,
): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId, 'workOrders', orderId), {
    status: 'sold',
    finalSalePrice,
  })
}

export async function updateQuote(
  sessionId: string,
  orderId: string,
  quotedYield: number,
  quotedCost: number,
  quotedTime: number,
  sellPrice: number,
): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId, 'workOrders', orderId), {
    quotedYield,
    quotedCost,
    quotedTime,
    sellPrice,
  })
}

export async function deleteWorkOrder(sessionId: string, orderId: string): Promise<void> {
  await deleteDoc(doc(db, 'sessions', sessionId, 'workOrders', orderId))
}
